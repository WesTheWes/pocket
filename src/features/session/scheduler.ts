export const BEATS_PER_BAR = 4

export interface SchedulerDeps {
  /** The audio clock, in seconds. Beats are placed on this clock, never on a JS timer. */
  now: () => number
  /** Play a click at `time` (audio-clock seconds). */
  click: (time: number, accent: boolean) => void
  /** Wake the scheduler in about `ms`. Only used to top up the look-ahead window. */
  setTimer: (callback: () => void, ms: number) => unknown
  clearTimer: (handle: unknown) => void
  lookAheadMs?: number
  scheduleAheadSec?: number
  startDelaySec?: number
}

export interface Scheduler {
  start(bpm: number): void
  stop(): void
  /** Applies from the next beat that has not been scheduled yet. */
  setBpm(bpm: number): void
  isRunning(): boolean
  /** The beat (0 to 3) sounding at audio time `now`, or null before the first click or when stopped. */
  beatAt(now: number): number | null
}

/**
 * A look-ahead metronome scheduler. A timer wakes it every few milliseconds, and each time it
 * schedules every beat that falls inside the next ~100 ms on the audio clock. Because beat times
 * are accumulated from the last beat, not read from the timer, a late wake-up delays nothing and
 * the beats never drift.
 */
export function createScheduler(deps: SchedulerDeps): Scheduler {
  const lookAheadMs = deps.lookAheadMs ?? 25
  const scheduleAhead = deps.scheduleAheadSec ?? 0.1
  const startDelay = deps.startDelaySec ?? 0.05

  let running = false
  let bpm = 80
  let nextTime = 0
  let nextBeat = 0
  let timer: unknown
  let scheduled: Array<{ beat: number; time: number }> = []

  function tick() {
    if (!running) return
    const horizon = deps.now() + scheduleAhead
    while (nextTime < horizon) {
      deps.click(nextTime, nextBeat === 0)
      scheduled.push({ beat: nextBeat, time: nextTime })
      nextTime += 60 / bpm
      nextBeat = (nextBeat + 1) % BEATS_PER_BAR
    }
    // Only recent beats matter for beatAt.
    if (scheduled.length > 32) scheduled = scheduled.slice(-16)
    timer = deps.setTimer(tick, lookAheadMs)
  }

  return {
    start(startBpm) {
      if (running) return
      running = true
      bpm = startBpm
      nextTime = deps.now() + startDelay
      nextBeat = 0
      scheduled = []
      tick()
    },
    stop() {
      running = false
      deps.clearTimer(timer)
      scheduled = []
    },
    setBpm(next) {
      bpm = next
    },
    isRunning: () => running,
    beatAt(now) {
      if (!running) return null
      let current: number | null = null
      for (const entry of scheduled) if (entry.time <= now) current = entry.beat
      return current
    },
  }
}
