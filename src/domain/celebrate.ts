import { fastestSolidBpm } from './progress'
import { isSolid } from './quality'
import type { Attempt, Goal } from './schemas'

/*
 * The small facts a celebration is made of, all read from attempts: how the goal was done, what
 * it took, and how a session is going. Nothing is stored.
 */

const attemptsFor = (goal: Goal, attempts: Attempt[]) =>
  attempts.filter((attempt) => attempt.goalId === goal.id).sort((a, b) => a.at - b.at)

/** Solid attempts in a row at the end of this session's attempts for the goal. */
export function solidRun(goal: Goal, attempts: Attempt[], sessionId: string): number {
  const inSession = attemptsFor(goal, attempts).filter((a) => a.sessionId === sessionId)
  let run = 0
  for (let i = inSession.length - 1; i >= 0 && isSolid(inSession[i].level); i--) run++
  return run
}

export interface DoneFacts {
  /** How many attempts it took, this one included. */
  attemptCount: number
  /** The tempo of the very first attempt with one, or null. */
  firstBpm: number | null
  /** When the first attempt was logged. */
  firstAt: number | null
  /** The fastest Solid tempo, or null for a goal without tempos. */
  fastest: number | null
}

/** What finishing the goal took. */
export function doneFacts(goal: Goal, attempts: Attempt[]): DoneFacts {
  const own = attemptsFor(goal, attempts)
  const first = own.find((attempt) => attempt.bpm !== null)
  return {
    attemptCount: own.length,
    firstBpm: first?.bpm ?? null,
    firstAt: own[0]?.at ?? null,
    fastest: fastestSolidBpm(goal, attempts),
  }
}

/** Fastest Solid tempo minus the first tempo ever tried, when both exist and it is a gain. */
export function bpmGained(goal: Goal, attempts: Attempt[]): number | null {
  const { firstBpm, fastest } = doneFacts(goal, attempts)
  if (firstBpm === null || fastest === null || fastest <= firstBpm) return null
  return fastest - firstBpm
}

/** "1st", "2nd", "3rd", "4th", "11th", "21st". */
export function ordinal(n: number): string {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}
