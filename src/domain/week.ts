import type { Session } from './schemas'

/*
 * The week strip and the streak: which days you practised, by local calendar day. A day counts
 * when a session started on it. Days are compared by their local midnight, so a daylight-saving
 * change (a 23 or 25 hour day) never splits or merges days.
 */

const HOUR = 60 * 60 * 1000

export const startOfDay = (time: number): number => {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const previousDay = (day: number) => startOfDay(day - 12 * HOUR)
const nextDay = (day: number) => startOfDay(day + 36 * HOUR)

const LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export interface WeekDay {
  label: string
  /** Local midnight. */
  at: number
  practised: boolean
  today: boolean
  future: boolean
}

/** Monday of the week `now` is in, as local midnight. */
export function weekStart(now: number): number {
  const today = startOfDay(now)
  const sinceMonday = (new Date(today).getDay() + 6) % 7
  let day = today
  for (let i = 0; i < sinceMonday; i++) day = previousDay(day)
  return day
}

/** The seven days of this week, Monday first, with whether you practised on each. */
export function weekDays(sessions: Session[], now: number): WeekDay[] {
  const today = startOfDay(now)
  const practised = new Set(sessions.map((session) => startOfDay(session.startedAt)))
  const days: WeekDay[] = []
  let day = weekStart(now)
  for (const label of LABELS) {
    days.push({
      label,
      at: day,
      practised: practised.has(day),
      today: day === today,
      future: day > today,
    })
    day = nextDay(day)
  }
  return days
}

/**
 * Days in a row with a session, counting back from today. A streak is not lost until the end of
 * the day: with nothing yet today it counts back from yesterday.
 */
export function streakDays(sessions: Session[], now: number): number {
  const practised = new Set(sessions.map((session) => startOfDay(session.startedAt)))
  let day = startOfDay(now)
  if (!practised.has(day)) day = previousDay(day)
  let streak = 0
  while (practised.has(day)) {
    streak++
    day = previousDay(day)
  }
  return streak
}
