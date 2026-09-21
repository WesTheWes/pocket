/*
 * "Back" should return to the screen you came from. A screen that links to a shared page (like a
 * goal's progress, reachable from Goals, Practice and Review) passes the address to come back to
 * in the link's state; the shared page reads it with `returnTarget`. Opened directly, with no
 * state, the page falls back to its usual parent.
 */

export interface ReturnState {
  returnTo: string
}

/** Link state saying "the back arrow on the next screen should come back to `path`". */
export function withReturn(path: string): ReturnState {
  return { returnTo: path }
}

/** Where a back arrow should go: the screen that sent you here, else `fallback`. */
export function returnTarget(state: unknown, fallback: string): string {
  const returnTo = (state as Partial<ReturnState> | null | undefined)?.returnTo
  const insideApp =
    typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
  return insideApp ? returnTo : fallback
}
