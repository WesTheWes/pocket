import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeAttempt, makeGoal } from '../../test/factories'
import { chooseTempo, recallTempo, rememberTempo } from './tempoMemory'

const goal = makeGoal({ id: 'g', targetBpm: 84 })
const attempt = (bpm: number | null, at: number, goalId = 'g') =>
  makeAttempt({ goalId, bpm, level: 4, at })

describe('chooseTempo', () => {
  it('uses the tempo you set for the goal', () => {
    expect(chooseTempo({ bpm: 120, at: 500 }, goal, [])).toBe(120)
  })

  it('keeps your setting when the last logged attempt is older', () => {
    expect(chooseTempo({ bpm: 120, at: 500 }, goal, [attempt(76, 100)])).toBe(120)
  })

  it('prefers a tempo you logged after you set it', () => {
    expect(chooseTempo({ bpm: 120, at: 500 }, goal, [attempt(90, 900)])).toBe(90)
  })

  it('goes by the most recent logged tempo when there are several', () => {
    const attempts = [attempt(60, 100), attempt(90, 900), attempt(70, 300)]
    expect(chooseTempo({ bpm: 120, at: 500 }, goal, attempts)).toBe(90)
  })

  it('ignores logged attempts that have no tempo, and other goals attempts', () => {
    const attempts = [attempt(null, 900), attempt(200, 900, 'other')]
    expect(chooseTempo({ bpm: 120, at: 500 }, goal, attempts)).toBe(120)
  })

  it('once your setting is newer again, it wins again', () => {
    expect(chooseTempo({ bpm: 110, at: 1000 }, goal, [attempt(90, 900)])).toBe(110)
  })

  it('with nothing remembered, starts where you left off: last logged, else half the target, else 80', () => {
    expect(chooseTempo(undefined, goal, [attempt(72, 100)])).toBe(72)
    expect(chooseTempo(undefined, goal, [])).toBe(42)
    expect(chooseTempo(undefined, { ...goal, targetBpm: null }, [])).toBe(80)
  })
})

describe('remembering a tempo for the tab', () => {
  afterEach(() => {
    vi.unstubAllGlobals() // first, so the real storage is back before it is cleared
    sessionStorage.clear()
  })

  it('recalls what was remembered', () => {
    rememberTempo('s1', 'g1', 96, 1234)
    expect(recallTempo('s1', 'g1')).toEqual({ bpm: 96, at: 1234 })
  })

  it('keeps each session and goal separate', () => {
    rememberTempo('s1', 'g1', 96, 1)
    rememberTempo('s1', 'g2', 100, 2)
    rememberTempo('s2', 'g1', 110, 3)
    expect(recallTempo('s1', 'g1')?.bpm).toBe(96)
    expect(recallTempo('s1', 'g2')?.bpm).toBe(100)
    expect(recallTempo('s2', 'g1')?.bpm).toBe(110)
    expect(recallTempo('s2', 'g2')).toBeUndefined()
  })

  it('remembers free practice, which has no goal', () => {
    rememberTempo('s1', null, 88, 1)
    expect(recallTempo('s1', null)?.bpm).toBe(88)
    expect(recallTempo('s1', 'g1')).toBeUndefined()
  })

  it('returns nothing when nothing was remembered', () => {
    expect(recallTempo('s1', 'g1')).toBeUndefined()
  })

  it('ignores damaged or out-of-range stored data', () => {
    sessionStorage.setItem('pocket:tempo:s1:g1', 'not json')
    expect(recallTempo('s1', 'g1')).toBeUndefined()
    sessionStorage.setItem('pocket:tempo:s1:g1', JSON.stringify({ bpm: 9999, at: 1 }))
    expect(recallTempo('s1', 'g1')).toBeUndefined()
    sessionStorage.setItem('pocket:tempo:s1:g1', JSON.stringify({ bpm: 90 }))
    expect(recallTempo('s1', 'g1')).toBeUndefined()
  })

  it('carries on quietly when storage is unavailable', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(() => rememberTempo('s1', 'g1', 96, 1)).not.toThrow()
    expect(recallTempo('s1', 'g1')).toBeUndefined()
  })
})
