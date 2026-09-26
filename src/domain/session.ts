import { averageProgress, fastestSolidBpm, goalDone, goalProgress } from './progress'
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
  /** Goal progress (0 to 1) before the session. */
  progressBefore: number
  /** Goal progress (0 to 1) after the session. */
  progressAfter: number
  becameDone: boolean
  improved: boolean
  /** The goal's most recent attempt before the session, or null if there was none. */
  lastBefore: Attempt | null
  /** This session's attempts for the goal, oldest first. Never empty. */
  attempts: Attempt[]
}

/**
 * Splits a song's attempts around a session: `earlier` were logged before it started, and
 * `afterAll` adds the session's own attempts to those (but nothing from later sessions).
 */
export function splitAtSession(session: Session, attempts: Attempt[]) {
  const earlier = attempts.filter((a) => a.sessionId !== session.id && a.at < session.startedAt)
  const inSession = attempts.filter((a) => a.sessionId === session.id)
  return { earlier, inSession, afterAll: [...earlier, ...inSession] }
}

/**
 * One entry per goal that has attempts in the session, comparing its progress before the
 * session (attempts logged earlier) with progress after it (those plus the session's attempts).
 */
export function sessionChanges(session: Session, goals: Goal[], attempts: Attempt[]): GoalChange[] {
  const { earlier, inSession, afterAll } = splitAtSession(session, attempts)

  return goals.flatMap((goal) => {
    const worked = inSession.filter((a) => a.goalId === goal.id).sort((a, b) => a.at - b.at)
    if (worked.length === 0) return []

    const before = fastestSolidBpm(goal, earlier)
    const after = fastestSolidBpm(goal, afterAll)
    const becameDone = !goalDone(goal, earlier) && goalDone(goal, afterAll)
    const gotFaster = after !== null && (before === null || after > before)
    const lastBefore = earlier
      .filter((a) => a.goalId === goal.id)
      .reduce<Attempt | null>((latest, a) => (latest === null || a.at > latest.at ? a : latest), null)

    return [
      {
        goal,
        before,
        after,
        deltaBpm: before !== null && after !== null ? after - before : null,
        progressBefore: goalProgress(goal, earlier),
        progressAfter: goalProgress(goal, afterAll),
        becameDone,
        improved: becameDone || gotFaster,
        lastBefore,
        attempts: worked,
      },
    ]
  })
}

/** The song's overall progress (every goal, 0 to 1) before and after the session. */
export function songProgressChange(
  session: Session,
  goals: Goal[],
  attempts: Attempt[],
): { before: number; after: number } {
  const { earlier, afterAll } = splitAtSession(session, attempts)
  return { before: averageProgress(goals, earlier), after: averageProgress(goals, afterAll) }
}

/** An open session older than this was almost certainly abandoned, not still being practiced. */
export const STALE_SESSION_MS = 12 * 60 * 60 * 1000

/** True for a session that was never finished and has been open for over 12 hours. */
export function isSessionStale(session: Session, now: number): boolean {
  return session.endedAt === null && now - session.startedAt > STALE_SESSION_MS
}
