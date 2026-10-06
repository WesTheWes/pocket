import { currentLevel } from './levels'
import { goalLocked } from './progress'
import type { Attempt, Goal, Session } from './schemas'
import { sessionChanges, sessionElapsedMs, splitAtSession } from './session'
import { streakDays } from './week'

/*
 * What a session was the first to do: goals finished, new fastest Solid tempos, a level reached,
 * the longest session in a month, a streak kept. Read from attempts and sessions, never stored.
 */

const DAY = 24 * 60 * 60 * 1000
const MONTH = 30 * DAY

export type FirstKind = 'done' | 'fastest' | 'level' | 'longest' | 'streak'

export interface First {
  kind: FirstKind
  title: string
  detail: string
}

/** The goals that were locked before the session and are open after it. */
export function openedInSession(session: Session, goals: Goal[], attempts: Attempt[]): Goal[] {
  const { earlier, afterAll } = splitAtSession(session, attempts)
  return goals.filter(
    (goal) => goalLocked(goal, goals, earlier) && !goalLocked(goal, goals, afterAll),
  )
}

/**
 * The session's firsts, in order of importance, at most `limit`. `goals` and `attempts` are the
 * song's; `sessions` are every song's, for the streak and the longest session.
 */
export function sessionFirsts(
  session: Session,
  goals: Goal[],
  attempts: Attempt[],
  sessions: Session[],
  limit = 4,
): First[] {
  const firsts: First[] = []
  const changes = sessionChanges(session, goals, attempts)

  for (const change of changes) {
    if (change.becameDone) {
      firsts.push({ kind: 'done', title: 'Goal done', detail: change.goal.title })
    }
  }
  for (const change of changes) {
    if (change.becameDone || change.after === null) continue
    if (change.before === null) {
      firsts.push({
        kind: 'fastest',
        title: 'First Solid',
        detail: `${change.after} BPM on ${change.goal.title}`,
      })
    } else if (change.after > change.before) {
      firsts.push({
        kind: 'fastest',
        title: 'New fastest Solid',
        detail: `${change.after} BPM, up from ${change.before}, on ${change.goal.title}`,
      })
    }
  }

  const { earlier, afterAll } = splitAtSession(session, attempts)
  const levelBefore = currentLevel(goals, earlier)
  const levelAfter = currentLevel(goals, afterAll)
  if (levelAfter > levelBefore) {
    const opened = openedInSession(session, goals, attempts).length
    firsts.push({
      kind: 'level',
      title: `Level ${levelAfter} reached`,
      detail:
        opened > 0
          ? `${opened} ${opened === 1 ? 'goal' : 'goals'} opened`
          : 'A new part of the song',
    })
  }

  const end = session.endedAt ?? session.startedAt
  const elapsed = sessionElapsedMs(session, end)
  const recent = sessions.filter(
    (other) => other.id !== session.id && other.startedAt >= end - MONTH && other.startedAt <= end,
  )
  if (recent.length > 0 && recent.every((other) => sessionElapsedMs(other, end) < elapsed)) {
    const minutes = Math.round(elapsed / 60_000)
    firsts.push({
      kind: 'longest',
      title: 'Longest this month',
      detail: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, ${changes.length} ${changes.length === 1 ? 'goal' : 'goals'}`,
    })
  }

  const streak = streakDays(sessions, session.startedAt)
  if (streak >= 2) {
    firsts.push({ kind: 'streak', title: 'Streak kept', detail: `${streak} days in a row` })
  }

  return firsts.slice(0, limit)
}
