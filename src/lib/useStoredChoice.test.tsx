import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStoredChoice } from './useStoredChoice'

const OPTIONS = ['a', 'b', 'c'] as const

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('useStoredChoice', () => {
  it('starts at the fallback when nothing is stored', () => {
    expect(renderHook(() => useStoredChoice('k', OPTIONS, 'b')).result.current[0]).toBe('b')
  })

  it('remembers a change, across a fresh mount', () => {
    const first = renderHook(() => useStoredChoice('k', OPTIONS, 'a'))
    act(() => first.result.current[1]('c'))
    expect(first.result.current[0]).toBe('c')
    first.unmount()
    expect(renderHook(() => useStoredChoice('k', OPTIONS, 'a')).result.current[0]).toBe('c')
  })

  it('ignores a stored value that is not one of the options', () => {
    localStorage.setItem('k', 'banana')
    expect(renderHook(() => useStoredChoice('k', OPTIONS, 'a')).result.current[0]).toBe('a')
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
    const { result } = renderHook(() => useStoredChoice('k', OPTIONS, 'a'))
    expect(result.current[0]).toBe('a')
    act(() => result.current[1]('b'))
    expect(result.current[0]).toBe('b')
  })
})
