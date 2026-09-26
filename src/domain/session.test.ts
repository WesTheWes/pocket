import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal, makeSession } from '../test/factories'
import {
  endSession,
  isSessionStale,
  pauseSession,
  resumeSession,
  sessionChanges,
  sessionElapsedMs,
  songProgressChange,
} from './session'

const SECOND = 1000

describe('sessionElapsedMs', () => {
  it('counts from the stored startedAt, not from when it is called', () => {
    const session = makeSession({ startedAt: 1_000 })
    expect(sessionElapsedMs(session, 1_000 + 90 * SECOND)).toBe(90 * SECOND)
  })

  it('excludes time already paused', () => {
    const session = makeSession({ startedAt: 0, pausedMs: 20 * SECOND })
    expect(sessionElapsedMs(session, 100 * SECOND)).toBe(80 * SECOND)
  })

  it('freezes while a pause is open', () => {
    const session = makeSession({ startedAt: 0, pausedAt: 30 * SECOND })
    expect(sessionElapsedMs(session, 30 * SECOND)).toBe(30 * SECOND)
    expect(sessionElapsedMs(session, 500 * SECOND)).toBe(30 * SECOND)
  })

  it('stops at endedAt', () => {
    const session = makeSession({ startedAt: 0, endedAt: 60 * SECOND })
    expect(sessionElapsedMs(session, 500 * SECOND)).toBe(60 * SECOND)
  })

  it('is never negative', () => {
    expect(sessionElapsedMs(makeSession({ startedAt: 100 }), 50)).toBe(0)
  })
})

describe('pauseSession and resumeSession', () => {
  it('a pause then resume adds the paused span to pausedMs', () => {
    const running = makeSession({ startedAt: 0 })
    const paused = pauseSession(running, 10 * SECOND)
    expect(paused.pausedAt).toBe(10 * SECOND)
    const resumed = resumeSession(paused, 15 * SECOND)
    expect(resumed.pausedAt).toBeNull()
    expect(resumed.pausedMs).toBe(5 * SECOND)
  })

  it('pausing an already paused session changes nothing', () => {
    const paused = makeSession({ pausedAt: 10 * SECOND })
    expect(pauseSession(paused, 20 * SECOND)).toEqual(paused)
  })

  it('resuming a running session changes nothing', () => {
    const running = makeSession()
    expect(resumeSession(running, 20 * SECOND)).toEqual(running)
  })

  it('does not mutate its input', () => {
    const running = makeSession()
    pauseSession(running, 10 * SECOND)
    expect(running.pausedAt).toBeNull()
  })
})

describe('endSession', () => {
  it('sets endedAt', () => {
    expect(endSession(makeSession(), 60 * SECOND).endedAt).toBe(60 * SECOND)
  })

  it('closes an open pause so the paused time is not counted', () => {
    const paused = makeSession({ startedAt: 0, pausedAt: 40 * SECOND })
    const ended = endSession(paused, 100 * SECOND)
    expect(ended.pausedAt).toBeNull()
    expect(ended.pausedMs).toBe(60 * SECOND)
    expect(sessionElapsedMs(ended, 999 * SECOND)).toBe(40 * SECOND)
  })

  it('ending an ended session changes nothing', () => {
    const ended = makeSession({ endedAt: 60 * SECOND })
    expect(endSession(ended, 90 * SECOND)).toEqual(ended)
  })
})

describe('sessionChanges', () => {
  const session = makeSession({ id: 's', startedAt: 1_000, endedAt: 5_000 })
  const solid = (goalId: string, bpm: number | null, at: number, sessionId: string | null = null) =>
    makeAttempt({ goalId, bpm, level: 4, at, sessionId })

  it('compares progress before the session with progress after it', () => {
    const goal = makeGoal({ id: 'a', targetBpm: 84 })
    const attempts = [solid('a', 72, 500), solid('a', 76, 2_000, 's')]
    const [change] = sessionChanges(session, [goal], attempts)
    expect(change.goal.id).toBe('a')
    expect(change.before).toBe(72)
    expect(change.after).toBe(76)
    expect(change.deltaBpm).toBe(4)
    expect(change.improved).toBe(true)
    expect(change.becameDone).toBe(false)
  })

  it('reports a goal that reached its target as done', () => {
    const goal = makeGoal({ id: 'a', targetBpm: 80 })
    const attempts = [solid('a', 72, 500), solid('a', 80, 2_000, 's')]
    const [change] = sessionChanges(session, [goal], attempts)
    expect(change.becameDone).toBe(true)
    expect(change.improved).toBe(true)
  })

  it('reports the first Solid attempt as an improvement with no before value', () => {
    const goal = makeGoal({ id: 'a', targetBpm: 84 })
    const [change] = sessionChanges(session, [goal], [solid('a', 60, 2_000, 's')])
    expect(change.before).toBeNull()
    expect(change.after).toBe(60)
    expect(change.deltaBpm).toBeNull()
    expect(change.improved).toBe(true)
  })

  it('reports no change when the session only logged sub-Solid attempts', () => {
    const goal = makeGoal({ id: 'a', targetBpm: 84 })
    const attempts = [
      solid('a', 72, 500),
      makeAttempt({ goalId: 'a', bpm: 90, level: 3, at: 2_000, sessionId: 's' }),
    ]
    const [change] = sessionChanges(session, [goal], attempts)
    expect(change.improved).toBe(false)
    expect(change.deltaBpm).toBe(0)
  })

  it('handles a goal with no target tempo becoming done', () => {
    const goal = makeGoal({ id: 'a', targetBpm: null })
    const [change] = sessionChanges(session, [goal], [solid('a', null, 2_000, 's')])
    expect(change.becameDone).toBe(true)
    expect(change.improved).toBe(true)
  })

  it('only includes goals that have attempts in this session', () => {
    const worked = makeGoal({ id: 'a' })
    const untouched = makeGoal({ id: 'b' })
    const changes = sessionChanges(session, [worked, untouched], [solid('a', 60, 2_000, 's')])
    expect(changes.map((c) => c.goal.id)).toEqual(['a'])
  })

  it('ignores attempts from later sessions when working out "after"', () => {
    const goal = makeGoal({ id: 'a', targetBpm: 84 })
    const attempts = [solid('a', 72, 2_000, 's'), solid('a', 84, 9_000, 'later')]
    const [change] = sessionChanges(session, [goal], attempts)
    expect(change.after).toBe(72)
  })

  it('reports goal progress before and after the session', () => {
    const goal = makeGoal({ id: 'a', targetBpm: 80 })
    const attempts = [solid('a', 40, 500), solid('a', 60, 2_000, 's')]
    const [change] = sessionChanges(session, [goal], attempts)
    expect(change.progressBefore).toBe(0.5)
    expect(change.progressAfter).toBe(0.75)
  })

  it('remembers the most recent attempt before the session, whatever its level', () => {
    const goal = makeGoal({ id: 'a' })
    const older = solid('a', 50, 100)
    const latest = makeAttempt({ goalId: 'a', bpm: 54, level: 2, at: 800 })
    const attempts = [latest, older, solid('a', 60, 2_000, 's')]
    expect(sessionChanges(session, [goal], attempts)[0].lastBefore).toEqual(latest)
  })

  it('has no attempt before the session for a goal first played in it', () => {
    const goal = makeGoal({ id: 'a' })
    const [change] = sessionChanges(session, [goal], [solid('a', 60, 2_000, 's')])
    expect(change.lastBefore).toBeNull()
  })

  it("lists the session's attempts oldest first", () => {
    const goal = makeGoal({ id: 'a' })
    const late = solid('a', 70, 3_000, 's')
    const early = solid('a', 60, 2_000, 's')
    const [change] = sessionChanges(session, [goal], [late, early])
    expect(change.attempts).toEqual([early, late])
  })
})

describe('songProgressChange', () => {
  const session = makeSession({ id: 's', startedAt: 1_000, endedAt: 5_000 })

  it('averages every goal of the song before and after the session', () => {
    const worked = makeGoal({ id: 'a', targetBpm: 80 })
    const untouched = makeGoal({ id: 'b', targetBpm: 80 })
    const attempts = [
      makeAttempt({ goalId: 'a', bpm: 40, level: 4, at: 500 }),
      makeAttempt({ goalId: 'b', bpm: 80, level: 4, at: 500 }),
      makeAttempt({ goalId: 'a', bpm: 80, level: 4, at: 2_000, sessionId: 's' }),
      makeAttempt({ goalId: 'b', bpm: 20, level: 4, at: 9_000, sessionId: 'later' }),
    ]
    expect(songProgressChange(session, [worked, untouched], attempts)).toEqual({
      before: 0.75,
      after: 1,
    })
  })

  it('is zero before and after for a song with no goals', () => {
    expect(songProgressChange(session, [], [])).toEqual({ before: 0, after: 0 })
  })
})

describe('isSessionStale', () => {
  const HOUR = 60 * 60 * 1000

  it('is false for a session that is still recent', () => {
    expect(isSessionStale(makeSession({ startedAt: 0 }), 11 * HOUR)).toBe(false)
  })

  it('is true for an open session left running for more than 12 hours', () => {
    expect(isSessionStale(makeSession({ startedAt: 0 }), 12 * HOUR + 1)).toBe(true)
  })

  it('applies to a paused session too', () => {
    expect(isSessionStale(makeSession({ startedAt: 0, pausedAt: HOUR }), 30 * HOUR)).toBe(true)
  })

  it('is never true for a session that has ended', () => {
    expect(isSessionStale(makeSession({ startedAt: 0, endedAt: HOUR }), 100 * HOUR)).toBe(false)
  })
})
