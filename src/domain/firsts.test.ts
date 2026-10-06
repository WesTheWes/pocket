import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal, makeSession } from '../test/factories'
import { openedInSession, sessionFirsts } from './firsts'

const DAY = 24 * 60 * 60 * 1000
const a = makeGoal({ id: 'a', title: 'A', targetBpm: 100 })
const b = makeGoal({ id: 'b', title: 'B', targetBpm: 100, requires: ['a'] })
const goals = [a, b]
const session = makeSession({ id: 's', startedAt: 10 * DAY, endedAt: 10 * DAY + 20 * 60_000 })
const inSession = (goalId: string, bpm: number, level: 1 | 2 | 3 | 4 | 5) =>
  makeAttempt({ goalId, bpm, level, sessionId: 's', at: 10 * DAY + 60_000 })

describe('sessionFirsts', () => {
  it('names the goal finished, the level reached and what opened', () => {
    const firsts = sessionFirsts(session, goals, [inSession('a', 100, 4)], [session])
    expect(firsts).toEqual([
      { kind: 'done', title: 'Goal done', detail: 'A' },
      { kind: 'level', title: 'Level 2 reached', detail: '1 goal opened' },
    ])
    expect(openedInSession(session, goals, [inSession('a', 100, 4)]).map((g) => g.id)).toEqual([
      'b',
    ])
  })

  it('tells a first Solid from a new fastest one', () => {
    expect(sessionFirsts(session, goals, [inSession('a', 60, 4)], [session])[0]).toEqual({
      kind: 'fastest',
      title: 'First Solid',
      detail: '60 BPM on A',
    })
    const earlier = makeAttempt({ goalId: 'a', bpm: 60, level: 4, at: 5 * DAY })
    expect(sessionFirsts(session, goals, [earlier, inSession('a', 72, 4)], [session])[0]).toEqual({
      kind: 'fastest',
      title: 'New fastest Solid',
      detail: '72 BPM, up from 60, on A',
    })
    expect(sessionFirsts(session, goals, [earlier, inSession('a', 60, 4)], [session])).toEqual([])
  })

  it('notices the longest session in a month, and a streak', () => {
    const shorter = makeSession({ id: 'p', startedAt: 9 * DAY, endedAt: 9 * DAY + 5 * 60_000 })
    const longer = makeSession({ id: 'q', startedAt: 8 * DAY, endedAt: 8 * DAY + 60 * 60_000 })
    const old = makeSession({
      id: 'o',
      startedAt: 10 * DAY - 40 * DAY,
      endedAt: 10 * DAY - 40 * DAY + 60 * 60_000,
    })
    expect(sessionFirsts(session, goals, [], [session, shorter, old])).toEqual([
      { kind: 'longest', title: 'Longest this month', detail: '20 minutes, 0 goals' },
      { kind: 'streak', title: 'Streak kept', detail: '2 days in a row' },
    ])
    expect(sessionFirsts(session, goals, [], [session, longer]).map((f) => f.kind)).toEqual([])
    expect(sessionFirsts(session, goals, [], [session])).toEqual([])
  })

  it('keeps to the limit, most important first', () => {
    const shorter = makeSession({ id: 'p', startedAt: 9 * DAY, endedAt: 9 * DAY + 5 * 60_000 })
    const firsts = sessionFirsts(session, goals, [inSession('a', 100, 4)], [session, shorter], 2)
    expect(firsts.map((f) => f.kind)).toEqual(['done', 'level'])
  })
})
