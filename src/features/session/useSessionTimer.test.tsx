import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeSession } from '../../test/factories'
import { useSessionTimer } from './useSessionTimer'

const START = new Date('2026-09-21T12:00:00Z').getTime()
const SECOND = 1000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})
afterEach(() => vi.useRealTimers())

describe('useSessionTimer', () => {
  it('shows the true elapsed time straight away, not time since the component mounted', () => {
    const session = makeSession({ startedAt: START - 5 * 60 * SECOND })
    const { result } = renderHook(() => useSessionTimer(session))
    expect(result.current).toBe(5 * 60 * SECOND)
  })

  it('keeps counting while the session runs', () => {
    const session = makeSession({ startedAt: START })
    const { result } = renderHook(() => useSessionTimer(session))
    expect(result.current).toBe(0)
    act(() => {
      vi.advanceTimersByTime(3 * SECOND)
    })
    expect(result.current).toBe(3 * SECOND)
  })

  it('freezes while paused', () => {
    const session = makeSession({ startedAt: START - 60 * SECOND, pausedAt: START - 30 * SECOND })
    const { result } = renderHook(() => useSessionTimer(session))
    expect(result.current).toBe(30 * SECOND)
    act(() => {
      vi.advanceTimersByTime(20 * SECOND)
    })
    expect(result.current).toBe(30 * SECOND)
  })

  it('carries on from the right time when resumed', () => {
    const paused = makeSession({ startedAt: START - 60 * SECOND, pausedAt: START - 30 * SECOND })
    const { result, rerender } = renderHook(({ session }) => useSessionTimer(session), {
      initialProps: { session: paused },
    })
    act(() => {
      vi.advanceTimersByTime(10 * SECOND)
    })
    // Resumed now: the 40 s spent paused (30 s before, 10 s just now) is not counted.
    const resumed = { ...paused, pausedAt: null, pausedMs: 40 * SECOND }
    rerender({ session: resumed })
    expect(result.current).toBe(30 * SECOND)
    act(() => {
      vi.advanceTimersByTime(5 * SECOND)
    })
    expect(result.current).toBe(35 * SECOND)
  })

  it('stops at the end time of a finished session', () => {
    const session = makeSession({ startedAt: START - 100 * SECOND, endedAt: START - 40 * SECOND })
    const { result } = renderHook(() => useSessionTimer(session))
    expect(result.current).toBe(60 * SECOND)
    act(() => {
      vi.advanceTimersByTime(60 * SECOND)
    })
    expect(result.current).toBe(60 * SECOND)
  })

  it('is zero when there is no session', () => {
    expect(renderHook(() => useSessionTimer(null)).result.current).toBe(0)
    expect(renderHook(() => useSessionTimer(undefined)).result.current).toBe(0)
  })
})
