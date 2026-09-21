import { fastestSolidBpm, goalDone } from './progress'
import type { Attempt, Goal, Session } from './schemas'

/**
 * Elapsed practice time, derived only from the stored session and a caller-supplied `now`.
 * Never seed a timer from the moment a component mounts.
 */
export function sessionElapsedMs(session: Session, now: number): number {
  const end = session.endedAt ?? now
  const openPause = session.pausedAt === null ? 0 : end - session.pausedAt
  return Math.max(0, end - session.startedAt - session.pausedMs - openPause)
}

export function pauseSession(session: Session, now: number): Session {
  if (session.pausedAt !== null || session.endedAt !== null) return session
  return { ...session, pausedAt: now }
}

export function resumeSession(session: Session, now: number): Session {
  if (session.pausedAt === null) return session
  return { ...session, pausedAt: null, pausedMs: session.pausedMs + (now - session.pausedAt) }
}

/** Ends the session, closing any open pause first so paused time is not counted. */
export function endSession(session: Session, now: number): Session {
  if (session.endedAt !== null) return session
  const resumed = resumeSession(session, now)
  return { ...resumed, endedAt: now }
}

export interface GoalChange {
  goal: Goal
  /** Fastest Solid tempo before the session, or null. */
  before: number | null
  /** Fastest Solid tempo after the session, or null. */
  after: number | null
  /** After minus before; null unless both exist. */
  deltaBpm: number | null
  becameDone: boolean
  improved: boolean
  /** This session's attempts for the goal, oldest first. */
  attempts: Attempt[]
}

/**
 * One entry per goal that has attempts in the session, comparing its progress before the
 * session (attempts logged earlier) with progress after it (those plus the session's attempts).
 */
export function sessionChanges(session: Session, goals: Goal[], attempts: Attempt[]): GoalChange[] {
  const earlier = attempts.filter((a) => a.sessionId !== session.id && a.at < session.startedAt)
  const inSession = attempts.filter((a) => a.sessionId === session.id)
  const afterAll = [...earlier, ...inSession]

  return goals.flatMap((goal) => {
    const worked = inSession.filter((a) => a.goalId === goal.id).sort((a, b) => a.at - b.at)
    if (worked.length === 0) return []

    const before = fastestSolidBpm(goal, earlier)
    const after = fastestSolidBpm(goal, afterAll)
    const becameDone = !goalDone(goal, earlier) && goalDone(goal, afterAll)
    const gotFaster = after !== null && (before === null || after > before)

    return [
      {
        goal,
        before,
        after,
        deltaBpm: before !== null && after !== null ? after - before : null,
        becameDone,
        improved: becameDone || gotFaster,
        attempts: worked,
      },
    ]
  })
}
