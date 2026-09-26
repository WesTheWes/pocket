import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal, makeSession } from '../test/factories'
import { practiceTimeSince, recentImprovements } from './stats'

const DAY = 24 * 60 * 60 * 1000
const MINUTE = 60 * 1000
const now = 100 * DAY

describe('recentImprovements', () => {
  const goal = makeGoal({ id: 'a', songId: 'song', targetBpm: 80 })
  const other = makeGoal({ id: 'b', songId: 'song', targetBpm: 80 })
  const sessionAt = (id: string, daysAgo: number) =>
    makeSession({
      id,
      songId: 'song',
      startedAt: now - daysAgo * DAY,
      endedAt: now - daysAgo * DAY + 30 * MINUTE,
    })
  const attemptIn = (session: { id: string; startedAt: number }, goalId: string, bpm: number) =>
    makeAttempt({ goalId, bpm, level: 4, at: session.startedAt + MINUTE, sessionId: session.id })

  it('lists goals whose progress rose, newest first, once per session', () => {
    const older = sessionAt('older', 7)
    const newer = sessionAt('newer', 4)
    const attempts = [attemptIn(older, 'a', 40), attemptIn(newer, 'a', 60)]
    const found = recentImprovements([older, newer], [goal], attempts, now, {
      days: 30,
      limit: 10,
    })
    expect(found.map((i) => [i.session.id, i.progressBefore, i.progressAfter])).toEqual([
      ['newer', 0.5, 0.75],
      ['older', 0, 0.5],
    ])
    expect(found[0].at).toBe(newer.endedAt)
  })

  it('leaves out goals that did not move', () => {
    const first = sessionAt('first', 7)
    const second = sessionAt('second', 4)
    const attempts = [attemptIn(first, 'a', 60), attemptIn(second, 'a', 60)]
    const found = recentImprovements([first, second], [goal], attempts, now, {
      days: 30,
      limit: 10,
    })
    expect(found.map((i) => i.session.id)).toEqual(['first'])
  })

  it('ignores sessions older than the window', () => {
    const old = sessionAt('old', 31)
    const found = recentImprovements([old], [goal], [attemptIn(old, 'a', 60)], now, {
      days: 30,
      limit: 10,
    })
    expect(found).toEqual([])
  })

  it('stops at the limit', () => {
    const session = sessionAt('s', 1)
    const attempts = [attemptIn(session, 'a', 60), attemptIn(session, 'b', 60)]
    const found = recentImprovements([session], [goal, other], attempts, now, {
      days: 30,
      limit: 1,
    })
    expect(found).toHaveLength(1)
  })

  it("only looks at the session's own song", () => {
    const session = sessionAt('s', 1)
    const elsewhere = makeGoal({ id: 'c', songId: 'other-song' })
    const found = recentImprovements([session], [elsewhere], [attemptIn(session, 'c', 60)], now, {
      days: 30,
      limit: 10,
    })
    expect(found).toEqual([])
  })
})

describe('practiceTimeSince', () => {
  it('adds up sessions started in the window, without paused time', () => {
    const sessions = [
      makeSession({ startedAt: now - 2 * DAY, endedAt: now - 2 * DAY + 20 * MINUTE }),
      makeSession({
        startedAt: now - DAY,
        endedAt: now - DAY + 15 * MINUTE,
        pausedMs: 5 * MINUTE,
      }),
      makeSession({ startedAt: now - 8 * DAY, endedAt: now - 8 * DAY + 60 * MINUTE }),
    ]
    expect(practiceTimeSince(sessions, now - 7 * DAY, now)).toBe(30 * MINUTE)
  })

  it('counts a session that is still open up to now', () => {
    const open = makeSession({ startedAt: now - 10 * MINUTE })
    expect(practiceTimeSince([open], now - 7 * DAY, now)).toBe(10 * MINUTE)
  })
})
