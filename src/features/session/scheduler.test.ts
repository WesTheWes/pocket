import { describe, expect, it } from 'vitest'
import { createScheduler } from './scheduler'

/** A fake audio clock and a timer we fire by hand. */
function fake() {
  let time = 0
  let pending: (() => void) | null = null
  const clicks: Array<{ time: number; accent: boolean; scheduledAt: number }> = []
  const scheduler = createScheduler({
    now: () => time,
    click: (at, accent) => clicks.push({ time: at, accent, scheduledAt: time }),
    setTimer: (callback) => {
      pending = callback
      return 1
    },
    clearTimer: () => {
      pending = null
    },
  })
  return {
    scheduler,
    clicks,
    advance(seconds: number) {
      time += seconds
    },
    /** Fire the scheduler's wake-up timer, as the browser would. */
    wake() {
      const callback = pending
      pending = null
      callback?.()
    },
    /** Let `seconds` of audio time pass in 25 ms wake-ups. */
    run(seconds: number) {
      for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 0.025) {
        time += 0.025
        const callback = pending
        pending = null
        callback?.()
      }
    },
    get armed() {
      return pending !== null
    },
  }
}

describe('createScheduler', () => {
  it('schedules the first click just ahead of now, and no further than the look-ahead', () => {
    const { scheduler, clicks } = fake()
    scheduler.start(120)
    expect(clicks.map((c) => c.time)).toEqual([0.05])
  })

  it('puts every click exactly on the beat grid', () => {
    const t = fake()
    t.scheduler.start(120)
    t.run(10)
    const times = t.clicks.map((c) => c.time)
    expect(times.length).toBeGreaterThanOrEqual(20)
    times.forEach((time, index) => expect(time).toBeCloseTo(0.05 + index * 0.5, 9))
  })

  it('accents the first beat of each bar of four', () => {
    const t = fake()
    t.scheduler.start(240)
    t.run(4)
    const accents = t.clicks.map((c) => c.accent)
    expect(accents.slice(0, 9)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
    ])
  })

  it('never schedules further ahead than the look-ahead window', () => {
    const t = fake()
    t.scheduler.start(200)
    t.run(6)
    for (const click of t.clicks)
      expect(click.time - click.scheduledAt).toBeLessThanOrEqual(0.1 + 1e-9)
  })

  it('does not drift or skip a beat when the timer wakes late', () => {
    const t = fake()
    t.scheduler.start(120)
    t.run(1)
    // The page stalls for 400 ms: the timer fires far later than planned.
    t.advance(0.4)
    t.wake()
    t.run(3)
    const times = t.clicks.map((c) => c.time)
    times.forEach((time, index) => expect(time).toBeCloseTo(0.05 + index * 0.5, 9))
  })

  it('uses a new tempo from the next unscheduled beat on, without a jump', () => {
    const t = fake()
    t.scheduler.start(120)
    t.run(2)
    t.scheduler.setBpm(60)
    const before = t.clicks.length
    t.run(6)
    const after = t.clicks.map((c) => c.time).slice(before - 1)
    const gaps = after.slice(1).map((time, i) => time - after[i])
    // One last 120 BPM beat may already have been scheduled; everything after is 60 BPM.
    expect(gaps.slice(1).every((gap) => Math.abs(gap - 1) < 1e-9)).toBe(true)
  })

  it('stops scheduling and cancels its timer', () => {
    const t = fake()
    t.scheduler.start(120)
    t.run(1)
    const count = t.clicks.length
    t.scheduler.stop()
    expect(t.scheduler.isRunning()).toBe(false)
    expect(t.armed).toBe(false)
    t.run(3)
    expect(t.clicks).toHaveLength(count)
  })

  it('ignores a second start while running', () => {
    const t = fake()
    t.scheduler.start(120)
    t.scheduler.start(60)
    expect(t.clicks).toHaveLength(1)
    t.run(2)
    // Still 120 BPM, not restarted at 60.
    expect(t.clicks[2].time - t.clicks[1].time).toBeCloseTo(0.5, 9)
  })

  it('can be started again after a stop, beginning on the downbeat', () => {
    const t = fake()
    t.scheduler.start(120)
    t.run(1)
    t.scheduler.stop()
    t.scheduler.start(120)
    expect(t.clicks[t.clicks.length - 1].accent).toBe(true)
  })

  describe('beatAt', () => {
    it('is null before the first click and when stopped', () => {
      const t = fake()
      expect(t.scheduler.beatAt(0)).toBeNull()
      t.scheduler.start(120)
      expect(t.scheduler.beatAt(0.01)).toBeNull()
      t.scheduler.stop()
      expect(t.scheduler.beatAt(5)).toBeNull()
    })

    it('reports the beat that is sounding at a given audio time', () => {
      const t = fake()
      t.scheduler.start(120)
      t.run(3)
      // Clicks at 0.05, 0.55, 1.05, 1.55, 2.05 ...
      expect(t.scheduler.beatAt(0.05)).toBe(0)
      expect(t.scheduler.beatAt(0.54)).toBe(0)
      expect(t.scheduler.beatAt(0.55)).toBe(1)
      expect(t.scheduler.beatAt(1.6)).toBe(3)
      expect(t.scheduler.beatAt(2.1)).toBe(0)
    })
  })
})
