import { MAX_BPM, MIN_BPM } from '../domain/schemas'

/*
 * "Back" should return to the screen you came from. A screen that links to a shared page (like a
 * goal's progress, reachable from Goals, Practice and Review) passes the address to come back to
 * in the link's state; the shared page reads it with `returnTarget`. Opened directly, with no
 * state, the page falls back to its usual parent.
 */

export interface ReturnState {
  returnTo: string
  /** A tempo the next screen should start from, such as the metronome's. */
  bpm?: number
}

/**
 * Link state saying "the back arrow on the next screen should come back to `path`", and
 * optionally "start your tempo at `bpm`".
 */
export function withReturn(path: string, extras: { bpm?: number } = {}): ReturnState {
  return { returnTo: path, ...extras }
}

/** The tempo the previous screen passed along, if it is a whole number the app allows. */
export function tempoFrom(state: unknown): number | undefined {
  const bpm = (state as Partial<ReturnState> | null | undefined)?.bpm
  const valid = typeof bpm === 'number' && Number.isInteger(bpm) && bpm >= MIN_BPM && bpm <= MAX_BPM
  return valid ? bpm : undefined
}

/** Where a back arrow should go: the screen that sent you here, else `fallback`. */
export function returnTarget(state: unknown, fallback: string): string {
  const returnTo = (state as Partial<ReturnState> | null | undefined)?.returnTo
  const insideApp =
    typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
  return insideApp ? returnTo : fallback
}

const PRACTICE_SESSION = /^\/practice\/[^/?]+(\?.*)?$/

/** The practice session to go back to, if that is where you came from (not the review). */
export function practiceReturn(state: unknown): string | undefined {
  const to = returnTarget(state, '')
  return PRACTICE_SESSION.test(to) ? to : undefined
}
