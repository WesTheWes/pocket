import { useSyncExternalStore } from 'react'
import type { Session } from '../../domain/schemas'
import { sessionElapsedMs } from '../../domain/session'

const TICK_MS = 250

// The clock as an external store. Reading it always gives the current time (in stable 250 ms
// steps), and it only ticks while there is a running timer to redraw.
const currentTick = () => Math.floor(Date.now() / TICK_MS) * TICK_MS
const subscribeToTicks = (onChange: () => void) => {
  const interval = setInterval(onChange, TICK_MS)
  return () => clearInterval(interval)
}
const subscribeToNothing = () => () => {}

/**
 * Elapsed practice time for a session, in milliseconds. It is always derived from the stored
 * session (startedAt, pausedMs, pausedAt, endedAt), so a reload or a remount shows the true time.
 */
export function useSessionTimer(session: Session | null | undefined): number {
  const running = !!session && session.pausedAt === null && session.endedAt === null
  const now = useSyncExternalStore(running ? subscribeToTicks : subscribeToNothing, currentTick)
  return session ? sessionElapsedMs(session, now) : 0
}
