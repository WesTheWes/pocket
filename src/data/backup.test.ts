import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup, serializeBackup, summarize } from '../domain/backup'
import { makeTestRepos } from '../test/repos'
import { createSeedData } from './seed'

const NOW = Date.UTC(2026, 8, 21, 12)

async function twoSongs() {
  const { repos } = makeTestRepos()
  const a = await repos.songs.create({ title: 'Alpha' })
  const a1 = await repos.sections.create(a.id, { name: 'Verse' })
  const ag = await repos.goals.create({ songId: a.id, sectionId: a1.id, title: 'A goal' })
  await repos.attempts.create({ goalId: ag.id, bpm: 80, level: 4 })
  const b = await repos.songs.create({ title: 'Beta' })
  await repos.goals.create({ songId: b.id, title: 'B goal' })
  return { repos, a, b }
}

describe('a backup survives a round trip through a file', () => {
  it('restores exactly what was exported, after everything was cleared', async () => {
    const { repos } = makeTestRepos()
    await repos.backup.replaceAll(createSeedData(NOW))
    const before = await repos.backup.exportAll()

    const text = serializeBackup(createBackup(before, NOW))
    await repos.backup.clear()
    expect(summarize(await repos.backup.exportAll()).songs).toBe(0)

    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) await repos.backup.replaceAll(parsed.backup.data)

    const sortById = (rows: Array<{ id: string }>) =>
      [...rows].sort((x, y) => x.id.localeCompare(y.id))
    const after = await repos.backup.exportAll()
    for (const table of Object.keys(before) as Array<keyof typeof before>) {
      expect(sortById(after[table])).toEqual(sortById(before[table]))
    }
  })

  it('carries a backup between two separate databases', async () => {
    const source = makeTestRepos()
    await source.repos.backup.replaceAll(createSeedData(NOW))
    const text = serializeBackup(createBackup(await source.repos.backup.exportAll(), NOW))

    const target = makeTestRepos()
    const parsed = parseBackup(text)
    if (parsed.ok) await target.repos.backup.replaceAll(parsed.backup.data)
    expect(summarize(await target.repos.backup.exportAll())).toEqual(
      summarize(await source.repos.backup.exportAll()),
    )
  })
})

describe('replaceAll checks that the pieces fit together', () => {
  it('refuses data with a dangling reference, and leaves what was there untouched', async () => {
    const { repos } = await twoSongs()
    const data = createSeedData(NOW)
    data.goals[0].songId = 'nowhere'
    await expect(repos.backup.replaceAll(data)).rejects.toThrow(/inconsistent/i)
    expect((await repos.songs.list()).map((s) => s.title).sort()).toEqual(['Alpha', 'Beta'])
  })
})

describe('addMissing', () => {
  it('adds the songs the database does not have, with everything that belongs to them', async () => {
    const { repos } = await twoSongs()
    const other = makeTestRepos()
    await other.repos.backup.replaceAll(createSeedData(NOW))
    const incoming = await other.repos.backup.exportAll()

    const result = await repos.backup.addMissing(incoming)
    expect(result).toMatchObject({ added: 5, skipped: 0 })
    const all = await repos.backup.exportAll()
    expect(all.songs).toHaveLength(7)
    expect(all.goals.length).toBe(2 + incoming.goals.length)
    expect(all.attempts.length).toBe(1 + incoming.attempts.length)
  })

  it('leaves songs it already has completely alone, even if the backup differs', async () => {
    const { repos, a } = await twoSongs()
    const before = await repos.backup.exportAll()
    // The same song id, but changed in the backup: it must not overwrite or duplicate anything.
    const incoming = {
      ...before,
      songs: before.songs.map((s) =>
        s.id === a.id ? { ...s, title: 'Alpha (changed elsewhere)' } : s,
      ),
    }
    const result = await repos.backup.addMissing(incoming)
    expect(result).toMatchObject({ added: 0, skipped: 2 })
    expect(await repos.backup.exportAll()).toEqual(before)
  })

  it('adds only the missing song when the backup overlaps', async () => {
    const { repos } = await twoSongs()
    const before = await repos.backup.exportAll()

    const other = makeTestRepos(1_000, 'other')
    const extra = await other.repos.songs.create({ title: 'Gamma' })
    await other.repos.goals.create({ songId: extra.id, title: 'G goal' })
    const gamma = await other.repos.backup.exportAll()
    const incoming = {
      songs: [...before.songs, ...gamma.songs],
      sections: [...before.sections, ...gamma.sections],
      goals: [...before.goals, ...gamma.goals],
      attempts: [...before.attempts, ...gamma.attempts],
      sessions: [...before.sessions, ...gamma.sessions],
    }
    const result = await repos.backup.addMissing(incoming)
    expect(result).toMatchObject({ added: 1, skipped: 2 })
    expect((await repos.songs.list()).map((s) => s.title).sort()).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ])
  })

  it('is safe to run twice: the second time adds nothing', async () => {
    const { repos } = makeTestRepos()
    const incoming = createSeedData(NOW)
    expect(await repos.backup.addMissing(incoming)).toMatchObject({ added: 5 })
    const once = await repos.backup.exportAll()
    expect(await repos.backup.addMissing(incoming)).toMatchObject({ added: 0, skipped: 5 })
    expect(await repos.backup.exportAll()).toEqual(once)
  })

  it('adds nothing at all if any part of it cannot be added', async () => {
    const { repos } = await twoSongs()
    const before = await repos.backup.exportAll()
    // A new song whose section reuses the id of an existing song's section.
    const clash = makeTestRepos(1_000, 'clash')
    const song = await clash.repos.songs.create({ title: 'Clash' })
    const section = await clash.repos.sections.create(song.id, { name: 'Verse' })
    const incoming = await clash.repos.backup.exportAll()
    incoming.sections[0] = { ...section, id: before.sections[0].id }

    await expect(repos.backup.addMissing(incoming)).rejects.toThrow()
    expect(await repos.backup.exportAll()).toEqual(before)
  })

  it('refuses inconsistent data and changes nothing', async () => {
    const { repos } = await twoSongs()
    const before = await repos.backup.exportAll()
    const incoming = createSeedData(NOW)
    incoming.sections[0].songId = 'nowhere'
    await expect(repos.backup.addMissing(incoming)).rejects.toThrow(/inconsistent/i)
    expect(await repos.backup.exportAll()).toEqual(before)
  })

  it('refuses something that is not backup data at all', async () => {
    const { repos } = await twoSongs()
    await expect(repos.backup.addMissing({ songs: 'nope' })).rejects.toThrow()
  })
})
