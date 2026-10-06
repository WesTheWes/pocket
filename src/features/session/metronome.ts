import {
  createScheduler,
  type ClickKind,
  type Scheduler,
  type SchedulerDeps,
  type Subdivision,
} from './scheduler'

/*
 * The only Web Audio code in the app. It is described by these small interfaces, rather than the
 * DOM types, so tests can supply a fake context.
 */
export interface ParamLike {
  setValueAtTime(value: number, time: number): unknown
  exponentialRampToValueAtTime(value: number, time: number): unknown
}
export interface OscillatorLike {
  type: string
  frequency: { value: number }
  connect(destination: unknown): unknown
  start(time: number): void
  stop(time: number): void
}
export interface GainLike {
  gain: ParamLike
  connect(destination: unknown): unknown
}
export interface AudioContextLike {
  currentTime: number
  state: string
  destination: unknown
  createOscillator(): OscillatorLike
  createGain(): GainLike
  resume(): Promise<void>
  close(): Promise<void>
}

export const ACCENT_HZ = 1600
export const CLICK_HZ = 1100
export const SUB_HZ = 800

const CLICK_SECONDS = 0.05

const SOUNDS: Record<ClickKind, { hz: number; volume: number; seconds: number }> = {
  accent: { hz: ACCENT_HZ, volume: 0.5, seconds: CLICK_SECONDS },
  beat: { hz: CLICK_HZ, volume: 0.3, seconds: CLICK_SECONDS },
  // Between beats: lower, quieter and shorter, so the beat still stands out.
  sub: { hz: SUB_HZ, volume: 0.15, seconds: 0.035 },
}

/** The slider's 0 to 1 as a gain: squared, so the middle of the slider sounds about half as loud. */
export const volumeToGain = (volume: number) => Math.min(1, Math.max(0, volume)) ** 2

/** A short percussive blip at `time`: loudest and highest on the downbeat, softest between beats. */
function playClick(context: AudioContextLike, time: number, kind: ClickKind, output: GainLike) {
  const { hz, volume, seconds } = SOUNDS[kind]
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'square'
  oscillator.frequency.value = hz
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + seconds)
  oscillator.connect(gain)
  gain.connect(output)
  oscillator.start(time)
  oscillator.stop(time + seconds + 0.01)
}

export interface Metronome {
  /**
   * Call from a click or tap handler, so the browser allows audio.
   * Returns false if audio is unavailable or the metronome was disposed.
   */
  start(bpm: number): boolean
  stop(): void
  setBpm(bpm: number): void
  /** Click on every beat, or on eighths, triplets or sixteenths. Takes effect on the next beat. */
  setSubdivision(subdivision: Subdivision): void
  /** How loud, 0 (silent) to 1. Takes effect at once, also while running. */
  setVolume(volume: number): void
  isRunning(): boolean
  /** The beat (0 to 3) sounding right now, for the beat dots. */
  beatAt(): number | null
  /** Stops and releases the audio context. The metronome cannot be started again. */
  dispose(): void
}

export interface MetronomeDeps {
  createContext?: () => AudioContextLike | null
  setTimer?: SchedulerDeps['setTimer']
  clearTimer?: SchedulerDeps['clearTimer']
}

const defaultCreateContext = (): AudioContextLike | null =>
  typeof AudioContext === 'undefined' ? null : new AudioContext()

export function createMetronome(deps: MetronomeDeps = {}): Metronome {
  const createContext = deps.createContext ?? defaultCreateContext
  const setTimer = deps.setTimer ?? ((callback, ms) => setTimeout(callback, ms))
  const clearTimer =
    deps.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>))

  let context: AudioContextLike | null = null
  let scheduler: Scheduler | null = null
  let disposed = false
  let subdivision: Subdivision = 'quarter'
  let volume = 1
  // Every click goes through this one gain, so the volume is one knob.
  let master: GainLike | null = null

  // The context is created on first start, which is inside the user's tap.
  function ensure(): Scheduler | null {
    if (disposed) return null
    if (scheduler) return scheduler
    const created = createContext()
    if (!created) return null
    context = created
    const output = created.createGain()
    output.gain.setValueAtTime(volumeToGain(volume), created.currentTime)
    output.connect(created.destination)
    master = output
    scheduler = createScheduler({
      now: () => created.currentTime,
      click: (time, kind) => playClick(created, time, kind, output),
      setTimer,
      clearTimer,
    })
    scheduler.setSubdivision(subdivision)
    return scheduler
  }

  return {
    start(bpm) {
      const active = ensure()
      if (!active || !context) return false
      if (context.state === 'suspended') void context.resume()
      active.start(bpm)
      return true
    },
    stop() {
      scheduler?.stop()
    },
    setBpm(bpm) {
      scheduler?.setBpm(bpm)
    },
    setSubdivision(next) {
      subdivision = next
      scheduler?.setSubdivision(next)
    },
    setVolume(next) {
      volume = next
      if (master && context) master.gain.setValueAtTime(volumeToGain(next), context.currentTime)
    },
    isRunning: () => scheduler?.isRunning() ?? false,
    beatAt: () => (scheduler && context ? scheduler.beatAt(context.currentTime) : null),
    dispose() {
      disposed = true
      scheduler?.stop()
      if (context) void Promise.resolve(context.close()).catch(() => {})
    },
  }
}
