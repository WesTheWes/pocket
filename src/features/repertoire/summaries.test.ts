import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal, makeSection, makeSong } from '../../test/factories'
import { filterSummaries, sortSummaries, summarizeSongs, type SongSummary } from './summaries'

const solid = (goalId: string, at: number, bpm = 100) => makeAttempt({ goalId, bpm, level: 4, at })

// Three songs: "Blue" (learned, practiced long ago), "Alpha" (half done, practiced recently),
// and "Zed" (no goals, never practiced).
const blue = makeSong({ id: 'blue', title: 'Blue in Green', artist: 'Miles Davis', createdAt: 1 })
const alpha = makeSong({ id: 'alpha', title: 'Autumn Leaves', artist: 'Kosma', createdAt: 2 })
const zed = makeSong({ id: 'zed', title: 'Zed Song', artist: 'Nobody', createdAt: 3 })

const blueVerse = makeSection({ id: 'blue-verse', songId: 'blue', order: 0 })
const blueGoal = makeGoal({ id: 'bg', songId: 'blue', sectionId: 'blue-verse', targetBpm: 100 })
const alphaDone = makeGoal({ id: 'a1', songId: 'alpha', targetBpm: 100, createdAt: 1 })
const alphaTodo = makeGoal({ id: 'a2', songId: 'alpha', targetBpm: 100, createdAt: 2 })

const attempts = [solid('bg', 100), solid('a1', 900)]
const summaries = summarizeSongs(
  [blue, alpha, zed],
  [blueVerse],
  [blueGoal, alphaDone, alphaTodo],
  attempts,
)
const byId = (id: string) => summaries.find((s) => s.song.id === id) as SongSummary

describe('summarizeSongs', () => {
  it('computes progress, status and last practiced per song', () => {
    expect(byId('blue')).toMatchObject({
      goalCount: 1,
      doneCount: 1,
      progress: 1,
      status: 'learned',
      lastPracticedAt: 100,
    })
    expect(byId('alpha')).toMatchObject({
      goalCount: 2,
      doneCount: 1,
      progress: 0.5,
      status: 'in-progress',
      lastPracticedAt: 900,
    })
    expect(byId('zed')).toMatchObject({
      goalCount: 0,
      progress: 0,
      status: 'in-progress',
      lastPracticedAt: null,
    })
  })

  it('points the play button at the first goal that is not done', () => {
    expect(byId('alpha').nextGoalId).toBe('a2')
  })

  it('points at the first goal when everything is done, and at nothing when there are no goals', () => {
    expect(byId('blue').nextGoalId).toBe('bg')
    expect(byId('zed').nextGoalId).toBeNull()
  })
})

describe('filterSummaries', () => {
  const ids = (list: SongSummary[]) => list.map((s) => s.song.id)

  it('filters by status', () => {
    expect(ids(filterSummaries(summaries, { query: '', filter: 'all' }))).toHaveLength(3)
    expect(ids(filterSummaries(summaries, { query: '', filter: 'learned' }))).toEqual(['blue'])
    expect(ids(filterSummaries(summaries, { query: '', filter: 'in-progress' })).sort()).toEqual([
      'alpha',
      'zed',
    ])
  })

  it('searches title and artist, ignoring case and surrounding spaces', () => {
    expect(ids(filterSummaries(summaries, { query: '  AUTUMN ', filter: 'all' }))).toEqual([
      'alpha',
    ])
    expect(ids(filterSummaries(summaries, { query: 'davis', filter: 'all' }))).toEqual(['blue'])
  })

  it('combines search and status', () => {
    expect(ids(filterSummaries(summaries, { query: 'autumn', filter: 'learned' }))).toEqual([])
  })
})

describe('sortSummaries', () => {
  const order = (sort: 'recent' | 'title' | 'progress') =>
    sortSummaries(summaries, sort).map((s) => s.song.id)

  it('recent: latest practice first, never-practiced last', () => {
    expect(order('recent')).toEqual(['alpha', 'blue', 'zed'])
  })

  it('title: alphabetical', () => {
    expect(order('title')).toEqual(['alpha', 'blue', 'zed'])
  })

  it('progress: highest first, ties by title', () => {
    expect(order('progress')).toEqual(['blue', 'alpha', 'zed'])
  })

  it('does not mutate its input', () => {
    const before = summaries.map((s) => s.song.id)
    sortSummaries(summaries, 'progress')
    expect(summaries.map((s) => s.song.id)).toEqual(before)
  })
})
