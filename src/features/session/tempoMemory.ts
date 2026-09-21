import { startingBpm } from '../../domain/progress'
import { MAX_BPM, MIN_BPM, type Attempt, type Goal } from '../../domain/schemas'

/** A tempo the player set on the metronome, and when. */
export interface RememberedTempo {
  bpm: number
  at: number
}

/**
 * The tempo to start a goal at. What you set on the metronome is kept for the rest of the session,
 * unless you have logged an attempt at a tempo since: then what you logged wins. With nothing
 * remembered, it starts where you left off (the last logged tempo, else the target, else 80).
 */
export function chooseTempo(
  remembered: RememberedTempo | undefined,
  goal: Goal,
  attempts: Attempt[],
): number {
  if (remembered) {
    const lastLoggedAt = attempts
      .filter((attempt) => attempt.goalId === goal.id && attempt.bpm !== null)
      .reduce((latest, attempt) => Math.max(latest, attempt.at), -Infinity)
    if (remembered.at >= lastLoggedAt) return remembered.bpm
  }
  return startingBpm(goal, attempts)
}

/*
 * Kept in sessionStorage so it survives a trip to another screen (Log attempt) and a reload, but
 * not a new tab. Free practice, which has no goal, is stored under a goal id of null.
 */
const storageKey = (sessionId: string, goalId: string | null) =>
  `pocket:tempo:${sessionId}:${goalId ?? 'free'}`

export function rememberTempo(sessionId: string, goalId: string | null, bpm: number, at: number) {
  try {
    sessionStorage.setItem(storageKey(sessionId, goalId), JSON.stringify({ bpm, at }))
  } catch {
    // Storage can be unavailable (private mode, blocked); the tempo is just not remembered.
  }
}

export function recallTempo(sessionId: string, goalId: string | null): RememberedTempo | undefined {
  try {
    const stored = sessionStorage.getItem(storageKey(sessionId, goalId))
    if (!stored) return undefined
    const value: unknown = JSON.parse(stored)
    const { bpm, at } = (value ?? {}) as Partial<RememberedTempo>
    const valid =
      typeof bpm === 'number' &&
      Number.isInteger(bpm) &&
      bpm >= MIN_BPM &&
      bpm <= MAX_BPM &&
      typeof at === 'number'
    return valid ? { bpm, at } : undefined
  } catch {
    return undefined
  }
}
