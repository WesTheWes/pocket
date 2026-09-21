import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStoredFlag } from './useStoredFlag'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('useStoredFlag', () => {
  it('starts at the fallback when nothing is stored', () => {
    expect(renderHook(() => useStoredFlag('k', true)).result.current[0]).toBe(true)
    expect(renderHook(() => useStoredFlag('k', false)).result.current[0]).toBe(false)
  })

  it('remembers a change, across a fresh mount', () => {
    const first = renderHook(() => useStoredFlag('k', true))
    act(() => first.result.current[1](false))
    expect(first.result.current[0]).toBe(false)
    first.unmount()

    expect(renderHook(() => useStoredFlag('k', true)).result.current[0]).toBe(false)
  })

  it('keeps separate keys separate', () => {
    const a = renderHook(() => useStoredFlag('a', true))
    act(() => a.result.current[1](false))
    expect(renderHook(() => useStoredFlag('b', true)).result.current[0]).toBe(true)
  })

  it('ignores a stored value it does not understand', () => {
    localStorage.setItem('k', 'banana')
    expect(renderHook(() => useStoredFlag('k', true)).result.current[0]).toBe(true)
  })

  it('still works, just without remembering, when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    const { result } = renderHook(() => useStoredFlag('k', true))
    expect(result.current[0]).toBe(true)
    act(() => result.current[1](false))
    expect(result.current[0]).toBe(false)
  })
})
