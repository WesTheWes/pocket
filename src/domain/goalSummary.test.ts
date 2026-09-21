import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal } from '../test/factories'
import { goalSummary } from './goalSummary'

const goal = makeGoal({ id: 'g', targetBpm: 84 })
const attempt = (bpm: number | null, level: 1 | 2 | 3 | 4 | 5) =>
  makeAttempt({ goalId: 'g', bpm, level })

describe('goalSummary', () => {
  it('shows the fastest Solid tempo against the target', () => {
    expect(goalSummary(goal, [attempt(60, 4), attempt(72, 5), attempt(90, 3)])).toBe(
      'fastest Solid 72 of 84 BPM',
    )
  })

  it('still shows it once the target is reached', () => {
    expect(goalSummary(goal, [attempt(84, 4)])).toBe('fastest Solid 84 of 84 BPM')
  })

  it('says there is no Solid attempt yet, however many weaker ones there are', () => {
    expect(goalSummary(goal, [])).toBe('No Solid attempt yet')
    expect(goalSummary(goal, [attempt(100, 3), attempt(120, 1)])).toBe('No Solid attempt yet')
  })

  it('explains a Solid attempt that has no tempo when the goal needs one', () => {
    expect(goalSummary(goal, [attempt(null, 4)])).toBe('Solid attempt logged without a tempo')
  })

  it('for a goal with no target tempo, reports whether a Solid attempt exists', () => {
    const untimed = makeGoal({ id: 'g', targetBpm: null })
    expect(goalSummary(untimed, [])).toBe('No Solid attempt yet')
    expect(goalSummary(untimed, [attempt(60, 3)])).toBe('No Solid attempt yet')
    expect(goalSummary(untimed, [attempt(null, 4)])).toBe('Solid attempt logged')
  })

  it('ignores other goals attempts', () => {
    const other = makeAttempt({ goalId: 'other', bpm: 200, level: 5 })
    expect(goalSummary(goal, [other])).toBe('No Solid attempt yet')
  })
})
