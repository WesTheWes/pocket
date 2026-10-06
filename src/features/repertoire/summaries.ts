import { pathOrder } from '../../domain/levels'
import {
  firstUnfinishedGoal,
  goalStats,
  lastPracticedAt,
  songStatus,
  type SongStatus,
} from '../../domain/progress'
import type { Attempt, Goal, Section, Song } from '../../domain/schemas'

export type StatusFilter = 'all' | SongStatus
export type SortKey = 'recent' | 'title' | 'progress'

export interface SongSummary {
  song: Song
  goalCount: number
  doneCount: number
  /** 0 to 1 */
  progress: number
  status: SongStatus
  lastPracticedAt: number | null
  /** The goal the play button opens: the first open goal on the path, else the first not done, else the first. */
  nextGoalId: string | null
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const list = groups.get(key(item))
    if (list) list.push(item)
    else groups.set(key(item), [item])
  }
  return groups
}

export function summarizeSongs(
  songs: Song[],
  sections: Section[],
  goals: Goal[],
  attempts: Attempt[],
): SongSummary[] {
  const goalsBySong = groupBy(goals, (goal) => goal.songId)
  const sectionsBySong = groupBy(sections, (section) => section.songId)

  return songs.map((song) => {
    const songGoals = goalsBySong.get(song.id) ?? []
    const ordered = pathOrder(songGoals, sectionsBySong.get(song.id) ?? [])
    const stats = goalStats(songGoals, attempts)
    return {
      song,
      goalCount: stats.goalCount,
      doneCount: stats.doneCount,
      progress: stats.progress,
      status: songStatus(song, songGoals, attempts),
      lastPracticedAt: lastPracticedAt(songGoals, attempts),
      nextGoalId: firstUnfinishedGoal(ordered, attempts)?.id ?? null,
    }
  })
}

export function filterSummaries(
  summaries: SongSummary[],
  { query, filter }: { query: string; filter: StatusFilter },
): SongSummary[] {
  const needle = query.trim().toLowerCase()
  return summaries.filter(({ song, status }) => {
    if (filter !== 'all' && status !== filter) return false
    if (!needle) return true
    return `${song.title} ${song.artist}`.toLowerCase().includes(needle)
  })
}

export function sortSummaries(summaries: SongSummary[], sort: SortKey): SongSummary[] {
  const byTitle = (a: SongSummary, b: SongSummary) => a.song.title.localeCompare(b.song.title)
  const sorted = [...summaries]
  switch (sort) {
    case 'title':
      return sorted.sort(byTitle)
    case 'progress':
      return sorted.sort((a, b) => b.progress - a.progress || byTitle(a, b))
    case 'recent':
      return sorted.sort((a, b) => {
        // Never-practiced songs go last, newest first among themselves.
        if (a.lastPracticedAt === null && b.lastPracticedAt === null) {
          return b.song.createdAt - a.song.createdAt
        }
        if (a.lastPracticedAt === null) return 1
        if (b.lastPracticedAt === null) return -1
        return b.lastPracticedAt - a.lastPracticedAt
      })
  }
}
