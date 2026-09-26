import { describe, expect, it } from 'vitest'
import type { Attempt } from '../../domain/schemas'
import type { GoalChange } from '../../domain/session'
import { makeAttempt, makeGoal } from '../../test/factories'
import { changeTag, qualityText, tempoText } from './reviewText'

const attempt = (bpm: number | null, level: Attempt['level']) => makeAttempt({ bpm, level })

const change = (overrides: Partial<GoalChange>): GoalChange => ({
  goal: makeGoal(),
  before: null,
  after: null,
  deltaBpm: null,
  progressBefore: 0,
  progressAfter: 0,
  becameDone: false,
  improved: false,
  lastBefore: null,
  attempts: [attempt(60, 3)],
  ...overrides,
})

describe('tempoText', () => {
  it('compares the last tempo before the session with the last one in it', () => {
    expect(tempoText(change({ lastBefore: attempt(54, 1), attempts: [attempt(60, 2)] }))).toBe(
      '54 → 60 BPM',
    )
  })

  it('uses the last attempt of the session', () => {
    const attempts = [attempt(50, 2), attempt(66, 2)]
    expect(tempoText(change({ lastBefore: attempt(54, 1), attempts }))).toBe('54 → 66 BPM')
  })

  it('shows only the session tempo when there was nothing before', () => {
    expect(tempoText(change({ attempts: [attempt(60, 2)] }))).toBe('60 BPM')
  })

  it('handles attempts without a tempo', () => {
    expect(tempoText(change({ lastBefore: attempt(null, 2), attempts: [attempt(60, 2)] }))).toBe(
      'No tempo → 60 BPM',
    )
    expect(tempoText(change({ attempts: [attempt(null, 2)] }))).toBe('No tempo')
  })
})

describe('qualityText', () => {
  it('shows the move from one level to another', () => {
    expect(qualityText(change({ lastBefore: attempt(54, 1), attempts: [attempt(60, 2)] }))).toBe(
      "Can't play at all → Many mistakes",
    )
  })

  it('shows a single level when it did not change or there was nothing before', () => {
    expect(qualityText(change({ lastBefore: attempt(54, 3), attempts: [attempt(60, 3)] }))).toBe(
      'Few mistakes',
    )
    expect(qualityText(change({ attempts: [attempt(60, 4)] }))).toBe('Solid')
  })
})

describe('changeTag', () => {
  it('says Done when the goal reached its target', () => {
    expect(changeTag(change({ becameDone: true, lastBefore: attempt(90, 4) }))).toEqual({
      text: 'Done',
      good: true,
    })
  })

  it('lists what went up', () => {
    const tag = changeTag(change({ lastBefore: attempt(54, 1), attempts: [attempt(60, 2)] }))
    expect(tag).toEqual({ text: '+6 BPM · quality up', good: true })
    expect(changeTag(change({ lastBefore: attempt(72, 3), attempts: [attempt(76, 3)] })).text).toBe(
      '+4 BPM',
    )
  })

  it('calls out a first Solid attempt', () => {
    expect(changeTag(change({ after: 60, improved: true, attempts: [attempt(60, 4)] }))).toEqual({
      text: 'First Solid attempt at 60 BPM',
      good: true,
    })
  })

  it('calls out a first attempt that was not Solid yet', () => {
    expect(changeTag(change({}))).toEqual({ text: 'First attempt', good: false })
  })

  it('credits a new fastest Solid tempo even when the last attempt was slower', () => {
    const tag = changeTag(
      change({
        lastBefore: attempt(72, 4),
        attempts: [attempt(76, 4), attempt(70, 4)],
        before: 72,
        after: 76,
        improved: true,
      }),
    )
    expect(tag).toEqual({ text: 'Fastest Solid now 76 BPM', good: true })
  })

  it('says what went down, without highlighting it', () => {
    expect(changeTag(change({ lastBefore: attempt(72, 4), attempts: [attempt(68, 3)] }))).toEqual({
      text: '−4 BPM · quality down',
      good: false,
    })
  })

  it('says No change otherwise', () => {
    expect(changeTag(change({ lastBefore: attempt(68, 2), attempts: [attempt(68, 2)] }))).toEqual({
      text: 'No change',
      good: false,
    })
  })
})
