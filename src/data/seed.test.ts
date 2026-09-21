import { describe, expect, it } from 'vitest'
import { averageProgress, doneCount, songStatus } from '../domain/progress'
import { pocketDataSchema } from '../domain/schemas'
import { sessionChanges } from '../domain/session'
import { makeTestRepos } from '../test/repos'
import { createSeedData } from './seed'

const NOW = Date.UTC(2026, 8, 21, 12, 0, 0)
const data = createSeedData(NOW)

function forSong(songId: string) {
  const song = data.songs.find((s) => s.id === songId)!
  const goals = data.goals.filter((g) => g.songId === songId)
  return { song, goals, attempts: data.attempts }
}

describe('createSeedData', () => {
  it('is valid according to the schemas', () => {
    expect(() => pocketDataSchema.parse(data)).not.toThrow()
  })

  it('has unique ids and no dangling references', () => {
    const ids = [...data.songs, ...data.sections, ...data.goals, ...data.attempts, ...data.sessions]
    expect(new Set(ids.map((r) => r.id)).size).toBe(ids.length)

    const sectionIds = new Set(data.sections.map((s) => s.id))
    const goalIds = new Set(data.goals.map((g) => g.id))
    const sessionIds = new Set(data.sessions.map((s) => s.id))
    for (const song of data.songs) for (const id of song.structure) expect(sectionIds).toContain(id)
    for (const goal of data.goals) if (goal.sectionId) expect(sectionIds).toContain(goal.sectionId)
    for (const a of data.attempts) {
      expect(goalIds).toContain(a.goalId)
      if (a.sessionId) expect(sessionIds).toContain(a.sessionId)
    }
  })

  it('never puts attempts in the future', () => {
    expect(data.attempts.every((a) => a.at <= NOW)).toBe(true)
  })

  it('makes Piano Man show 68% with 3 of 8 goals done, as the design README specifies', () => {
    const { goals, attempts } = forSong('piano-man')
    expect(goals).toHaveLength(8)
    expect(doneCount(goals, attempts)).toBe(3)
    expect(Math.round(averageProgress(goals, attempts) * 100)).toBe(68)
  })

  it('gives Piano Man the design structure of 8 slots over 5 sections', () => {
    const { song } = forSong('piano-man')
    const sectionsOf = data.sections.filter((s) => s.songId === song.id)
    expect(sectionsOf.map((s) => s.name)).toEqual(['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'])
    const names = new Map(sectionsOf.map((s) => [s.id, s.name]))
    expect(song.structure.map((id) => names.get(id))).toEqual([
      'Intro',
      'Verse',
      'Chorus',
      'Verse',
      'Chorus',
      'Bridge',
      'Chorus',
      'Outro',
    ])
  })

  it('covers each Home state: learned, in progress, and empty', () => {
    const status = (id: string) => {
      const { song, goals, attempts } = forSong(id)
      return songStatus(song, goals, attempts)
    }
    expect(status('dont-stop-believin')).toBe('learned')
    expect(status('piano-man')).toBe('in-progress')
    expect(status('rocket-man')).toBe('in-progress')
    expect(forSong('rocket-man').goals).toEqual([])
  })

  it('includes a finished Piano Man session whose review shows one improvement', () => {
    const [session] = data.sessions
    expect(session.endedAt).not.toBeNull()
    const { goals, attempts } = forSong('piano-man')
    const changes = sessionChanges(session, goals, attempts)
    expect(changes.map((c) => [c.goal.title, c.improved])).toEqual([
      ['First 4 bars with only bass and melody', false],
      ['Walk-up fill into bar 5', true],
    ])
    for (const change of changes) {
      for (const a of change.attempts) {
        expect(a.at).toBeGreaterThanOrEqual(session.startedAt)
        expect(a.at).toBeLessThanOrEqual(session.endedAt!)
      }
    }
  })

  it('loads into a database via replaceAll', async () => {
    const { repos } = makeTestRepos()
    await repos.backup.replaceAll(data)
    expect(await repos.songs.list()).toHaveLength(5)
    expect(await repos.attempts.listBySong('piano-man')).toHaveLength(
      data.attempts.filter((a) => a.goalId.startsWith('piano-man')).length,
    )
  })
})
