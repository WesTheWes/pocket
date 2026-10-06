import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeAudioContext, installFakeAudio } from '../../test/fakeAudio'
import { useMetronome } from './useMetronome'

beforeEach(() => {
  installFakeAudio()
})
afterEach(() => vi.unstubAllGlobals())

describe('useMetronome', () => {
  it('starts silent and creates no audio until played', () => {
    const { result } = renderHook(() => useMetronome(90))
    expect(result.current.playing).toBe(false)
    expect(result.current.beat).toBeNull()
    expect(FakeAudioContext.instances).toHaveLength(0)
  })

  it('plays and stops on toggle', () => {
    const { result } = renderHook(() => useMetronome(90))
    act(() => result.current.toggle())
    expect(result.current.playing).toBe(true)
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].resumed).toBe(1)
    expect(FakeAudioContext.instances[0].oscillators).toBeGreaterThan(0)

    act(() => result.current.toggle())
    expect(result.current.playing).toBe(false)
  })

  it('reuses one audio context across plays', () => {
    const { result } = renderHook(() => useMetronome(90))
    act(() => result.current.toggle())
    act(() => result.current.toggle())
    act(() => result.current.toggle())
    expect(FakeAudioContext.instances).toHaveLength(1)
  })

  it('releases the audio context when the screen goes away', () => {
    const { result, unmount } = renderHook(() => useMetronome(90))
    act(() => result.current.toggle())
    unmount()
    expect(FakeAudioContext.instances[0].closed).toBe(1)
  })

  it('reports when audio is not available', () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('AudioContext', undefined)
    const { result } = renderHook(() => useMetronome(90))
    act(() => result.current.toggle())
    expect(result.current.playing).toBe(false)
    expect(result.current.supported).toBe(false)
  })

  it('sets the volume on the master gain, squared, before and while playing', () => {
    const { result, rerender } = renderHook(({ volume }) => useMetronome(90, 'quarter', volume), {
      initialProps: { volume: 0.5 },
    })
    act(() => result.current.toggle())
    const [master] = FakeAudioContext.instances[0].gains
    expect(master.values).toEqual([0.25])
    rerender({ volume: 0 })
    expect(master.values).toEqual([0.25, 0])
    rerender({ volume: 1 })
    expect(master.values).toEqual([0.25, 0, 1])
  })
})
