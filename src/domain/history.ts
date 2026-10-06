import { averageProgress } from './progress'
import type { Attempt, Goal, Session } from './schemas'

export interface ProgressPoint {
  /** The session this point is "after", or null for the point before the first session. */
  sessionId: string | null
  at: number
  /** Song progress, 0 to 1. */
  progress: number
}

/**
 * The song's overall progress before its first finished session and after each one, oldest
 * first: the line a review charts. A session's point counts every attempt logged in it plus
 * everything logged before it ended, so practice outside sessions folds into the next point.
 */
export function progressHistory(goals: Goal[], attempts: Attempt[], sessions: Session[]) {
  const finished = sessions
    .filter((session): session is Session & { endedAt: number } => session.endedAt !== null)
    .sort((a, b) => a.startedAt - b.startedAt)
  if (finished.length === 0) return []

  const first = finished[0]
  const before = attempts.filter((a) => a.at < first.startedAt && !inAny(a, finished))
  const points: ProgressPoint[] = [
    { sessionId: null, at: first.startedAt, progress: averageProgress(goals, before) },
  ]
  for (const session of finished) {
    const sofar = attempts.filter((a) => a.sessionId === session.id || a.at <= session.endedAt)
    points.push({
      sessionId: session.id,
      at: session.endedAt,
      progress: averageProgress(goals, sofar),
    })
  }
  return points
}

const inAny = (attempt: Attempt, sessions: Session[]) =>
  sessions.some((session) => session.id === attempt.sessionId)
