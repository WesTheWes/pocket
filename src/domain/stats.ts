import type { Attempt, Goal, Session } from './schemas'
import { sessionChanges, sessionElapsedMs, type GoalChange } from './session'

const DAY = 24 * 60 * 60 * 1000

export interface Improvement extends GoalChange {
  session: Session
  /** When the session finished (or started, if it is still open). */
  at: number
}

/**
 * Goals whose progress rose in a practice session within the last `days` days, newest first.
 * One entry per goal per session, so a goal improved twice appears twice.
 */
export function recentImprovements(
  sessions: Session[],
  goals: Goal[],
  attempts: Attempt[],
  now: number,
  { days, limit }: { days: number; limit: number },
): Improvement[] {
  const since = now - days * DAY
  return sessions
    .map((session) => ({ session, at: session.endedAt ?? session.startedAt }))
    .filter(({ at }) => at >= since)
    .flatMap(({ session, at }) => {
      const songGoals = goals.filter((goal) => goal.songId === session.songId)
      return sessionChanges(session, songGoals, attempts)
        .filter((change) => change.progressAfter > change.progressBefore)
        .map((change) => ({ ...change, session, at }))
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
}

/** Total practice time (paused time excluded) in sessions started at or after `since`. */
export function practiceTimeSince(sessions: Session[], since: number, now: number): number {
  return sessions
    .filter((session) => session.startedAt >= since)
    .reduce((total, session) => total + sessionElapsedMs(session, now), 0)
}
