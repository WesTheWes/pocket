import { createScheduler, type Scheduler, type SchedulerDeps } from './scheduler'

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

const CLICK_SECONDS = 0.05

/** A short percussive blip at `time`, louder and higher on the downbeat. */
function playClick(context: AudioContextLike, time: number, accent: boolean) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'square'
  oscillator.frequency.value = accent ? ACCENT_HZ : CLICK_HZ
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, time + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_SECONDS)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(time)
  oscillator.stop(time + CLICK_SECONDS + 0.01)
}

export interface Metronome {
  /**
   * Call from a click or tap handler, so the browser allows audio.
   * Returns false if audio is unavailable or the metronome was disposed.
   */
  start(bpm: number): boolean
  stop(): void
  setBpm(bpm: number): void
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

  // The context is created on first start, which is inside the user's tap.
  function ensure(): Scheduler | null {
    if (disposed) return null
    if (scheduler) return scheduler
    const created = createContext()
    if (!created) return null
    context = created
    scheduler = createScheduler({
      now: () => created.currentTime,
      click: (time, accent) => playClick(created, time, accent),
      setTimer,
      clearTimer,
    })
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
    isRunning: () => scheduler?.isRunning() ?? false,
    beatAt: () => (scheduler && context ? scheduler.beatAt(context.currentTime) : null),
    dispose() {
      disposed = true
      scheduler?.stop()
      if (context) void Promise.resolve(context.close()).catch(() => {})
    },
  }
}
