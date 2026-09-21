import { useLiveQuery } from 'dexie-react-hooks'
import { repos } from './index'

/*
 * Live reads. Each hook re-renders its component whenever the underlying data changes.
 * `undefined` means still loading. Hooks that fetch one record return `null` when it does not
 * exist, so a screen can tell "loading" from "not found".
 */

export const useSongs = () => useLiveQuery(() => repos.songs.list())

export const useSong = (id: string) =>
  useLiveQuery(async () => (await repos.songs.get(id)) ?? null, [id])

export const useSections = (songId: string) =>
  useLiveQuery(() => repos.sections.listBySong(songId), [songId])

export const useGoals = (songId: string) =>
  useLiveQuery(() => repos.goals.listBySong(songId), [songId])

export const useAllGoals = () => useLiveQuery(() => repos.goals.list())

export const useGoal = (id: string) =>
  useLiveQuery(async () => (await repos.goals.get(id)) ?? null, [id])

export const useSongAttempts = (songId: string) =>
  useLiveQuery(() => repos.attempts.listBySong(songId), [songId])

export const useAllAttempts = () => useLiveQuery(() => repos.attempts.list())

/** Newest first. */
export const useGoalAttempts = (goalId: string) =>
  useLiveQuery(() => repos.attempts.listByGoal(goalId), [goalId])

export const useSession = (id: string) =>
  useLiveQuery(async () => (await repos.sessions.get(id)) ?? null, [id])

export const useActiveSession = (songId: string) =>
  useLiveQuery(async () => (await repos.sessions.getActive(songId)) ?? null, [songId])
