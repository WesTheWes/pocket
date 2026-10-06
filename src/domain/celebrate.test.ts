import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal } from '../test/factories'
import { bpmGained, doneFacts, ordinal, solidRun } from './celebrate'

const goal = makeGoal({ id: 'g', targetBpm: 84 })
const attempt = (
  bpm: number | null,
  level: 1 | 2 | 3 | 4 | 5,
  at: number,
  sessionId: string | null = 's',
) => makeAttempt({ goalId: 'g', bpm, level, at, sessionId })

describe('solidRun', () => {
  it('counts Solid attempts in a row at the end of the session', () => {
    expect(
      solidRun(
        goal,
        [attempt(70, 4, 1), attempt(72, 2, 2), attempt(72, 4, 3), attempt(76, 5, 4)],
        's',
      ),
    ).toBe(2)
    expect(solidRun(goal, [attempt(70, 4, 1), attempt(72, 2, 2)], 's')).toBe(0)
    expect(solidRun(goal, [attempt(70, 4, 1, 'other'), attempt(72, 4, 2, null)], 's')).toBe(0)
    expect(solidRun(goal, [], 's')).toBe(0)
  })
})

describe('doneFacts and bpmGained', () => {
  it('reads what the goal took from its attempts', () => {
    const attempts = [attempt(null, 2, 1), attempt(60, 3, 2), attempt(84, 4, 3)]
    expect(doneFacts(goal, attempts)).toEqual({
      attemptCount: 3,
      firstBpm: 60,
      firstAt: 1,
      fastest: 84,
    })
    expect(bpmGained(goal, attempts)).toBe(24)
    expect(doneFacts(goal, [])).toEqual({
      attemptCount: 0,
      firstBpm: null,
      firstAt: null,
      fastest: null,
    })
  })

  it('reports no gain when there was none to speak of', () => {
    expect(bpmGained(goal, [attempt(84, 4, 1)])).toBeNull()
    expect(bpmGained(goal, [attempt(90, 2, 1), attempt(84, 4, 2)])).toBeNull()
  })
})

describe('ordinal', () => {
  it('spells the suffix', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '103rd',
    ])
  })
})
