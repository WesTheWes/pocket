import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal, makeSession } from '../test/factories'
import { progressHistory } from './history'

const goal = makeGoal({ id: 'g1', targetBpm: 100 })

describe('progressHistory', () => {
  it('is empty with no finished session', () => {
    expect(progressHistory([goal], [], [])).toEqual([])
    expect(progressHistory([goal], [], [makeSession({ endedAt: null })])).toEqual([])
  })

  it('starts before the first session and adds a point after each one, oldest first', () => {
    const sessions = [
      makeSession({ id: 's2', startedAt: 2000, endedAt: 2500 }),
      makeSession({ id: 's1', startedAt: 1000, endedAt: 1500 }),
    ]
    const attempts = [
      makeAttempt({ goalId: 'g1', bpm: 20, level: 4, at: 500 }),
      makeAttempt({ goalId: 'g1', bpm: 50, level: 4, at: 1100, sessionId: 's1' }),
      makeAttempt({ goalId: 'g1', bpm: 60, level: 2, at: 2100, sessionId: 's2' }),
      makeAttempt({ goalId: 'g1', bpm: 80, level: 4, at: 2200, sessionId: 's2' }),
    ]
    expect(progressHistory([goal], attempts, sessions)).toEqual([
      { sessionId: null, at: 1000, progress: 0.2 },
      { sessionId: 's1', at: 1500, progress: 0.5 },
      { sessionId: 's2', at: 2500, progress: 0.8 },
    ])
  })

  it('folds practice logged between sessions into the next point', () => {
    const sessions = [
      makeSession({ id: 's1', startedAt: 1000, endedAt: 1500 }),
      makeSession({ id: 's2', startedAt: 3000, endedAt: 3500 }),
    ]
    const attempts = [makeAttempt({ goalId: 'g1', bpm: 70, level: 4, at: 2000 })]
    expect(progressHistory([goal], attempts, sessions).map((p) => p.progress)).toEqual([0, 0, 0.7])
  })

  it('counts an attempt by its session even when its time is odd', () => {
    const sessions = [makeSession({ id: 's1', startedAt: 1000, endedAt: 1500 })]
    const attempts = [makeAttempt({ goalId: 'g1', bpm: 100, level: 4, at: 9000, sessionId: 's1' })]
    expect(progressHistory([goal], attempts, sessions).map((p) => p.progress)).toEqual([0, 1])
  })
})
