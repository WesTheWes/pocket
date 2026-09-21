import { describe, expect, it } from 'vitest'
import type { GoalChange } from '../../domain/session'
import { makeGoal } from '../../test/factories'
import { beforeAfterText, changeTag } from './reviewText'

const change = (overrides: Partial<GoalChange>): GoalChange => ({
  goal: makeGoal(),
  before: null,
  after: null,
  deltaBpm: null,
  becameDone: false,
  improved: false,
  attempts: [],
  ...overrides,
})

describe('beforeAfterText', () => {
  it('shows the move from one fastest Solid tempo to another', () => {
    expect(beforeAfterText(change({ before: 72, after: 76, deltaBpm: 4 }))).toBe(
      'fastest Solid 72 to 76 BPM',
    )
  })

  it('shows a single tempo when nothing moved', () => {
    expect(beforeAfterText(change({ before: 72, after: 72, deltaBpm: 0 }))).toBe(
      'fastest Solid 72 BPM',
    )
  })

  it('says there was no Solid attempt before', () => {
    expect(beforeAfterText(change({ before: null, after: 60 }))).toBe(
      'no Solid attempt yet to 60 BPM',
    )
  })

  it('says there is still no Solid attempt', () => {
    expect(beforeAfterText(change({ before: null, after: null }))).toBe('no Solid attempt yet')
  })

  it('handles a goal with no target tempo that became done without a tempo', () => {
    expect(beforeAfterText(change({ before: null, after: null, becameDone: true }))).toBe(
      'Solid attempt logged',
    )
  })
})

describe('changeTag', () => {
  it('says Done when the goal reached its target', () => {
    expect(changeTag(change({ becameDone: true, improved: true, deltaBpm: 4 }))).toBe('Done')
  })

  it('shows the tempo gained', () => {
    expect(changeTag(change({ before: 72, after: 76, deltaBpm: 4, improved: true }))).toBe('+4 BPM')
  })

  it('calls out a first Solid attempt', () => {
    expect(changeTag(change({ before: null, after: 60, improved: true }))).toBe(
      'First Solid attempt at 60 BPM',
    )
  })

  it('says No change otherwise', () => {
    expect(changeTag(change({ before: 72, after: 72, deltaBpm: 0 }))).toBe('No change')
    expect(changeTag(change({}))).toBe('No change')
  })
})
