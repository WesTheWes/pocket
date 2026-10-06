import type { Attempt } from './schemas'

/** The goal's most recent attempt that has a note, or null if none was ever written. */
export function latestNote(goalId: string, attempts: Attempt[]): Attempt | null {
  let latest: Attempt | null = null
  for (const attempt of attempts) {
    if (attempt.goalId !== goalId || attempt.note === '') continue
    if (latest === null || attempt.at > latest.at) latest = attempt
  }
  return latest
}
