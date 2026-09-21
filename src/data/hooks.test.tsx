import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useActiveSession, useSong, useSongs } from './hooks'
import { repos } from './index'

afterEach(async () => {
  await repos.backup.clear()
})

describe('live hooks', () => {
  it('starts undefined, then loads, then follows writes without being asked', async () => {
    const { result } = renderHook(() => useSongs())
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current).toEqual([]))

    await act(async () => {
      await repos.songs.create({ title: 'Piano Man' })
    })
    await waitFor(() => expect(result.current?.map((s) => s.title)).toEqual(['Piano Man']))

    await act(async () => {
      await repos.songs.create({ title: 'Sir Duke' })
    })
    await waitFor(() => expect(result.current).toHaveLength(2))
  })

  it('returns null, not undefined, for a record that does not exist', async () => {
    const { result } = renderHook(() => useSong('missing'))
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current).toBeNull())
  })

  it('tracks a single record as it changes', async () => {
    const song = await repos.songs.create({ title: 'Old' })
    const { result } = renderHook(() => useSong(song.id))
    await waitFor(() => expect(result.current?.title).toBe('Old'))

    await act(async () => {
      await repos.songs.update(song.id, { title: 'New' })
    })
    await waitFor(() => expect(result.current?.title).toBe('New'))
  })

  it('reports the active session and clears it when the session ends', async () => {
    const song = await repos.songs.create({ title: 'S' })
    const { result } = renderHook(() => useActiveSession(song.id))
    await waitFor(() => expect(result.current).toBeNull())

    let sessionId = ''
    await act(async () => {
      sessionId = (await repos.sessions.startOrResume(song.id)).id
    })
    await waitFor(() => expect(result.current?.id).toBe(sessionId))

    await act(async () => {
      await repos.sessions.end(sessionId)
    })
    await waitFor(() => expect(result.current).toBeNull())
  })
})
