import { describe, expect, it } from 'vitest'
import { sessionElapsedMs } from '../domain/session'
import { makeTestRepos } from '../test/repos'
import { RecordNotFoundError } from './index'

describe('songs', () => {
  it('creates a song with defaults, a trimmed title and a stamped createdAt', async () => {
    const { repos } = makeTestRepos(5_000)
    const song = await repos.songs.create({ title: '  Piano Man  ' })
    expect(song).toEqual({
      id: 'id-1',
      title: 'Piano Man',
      artist: '',
      chordNotes: '',
      tempo: null,
      structure: [],
      learnedOverride: false,
      createdAt: 5_000,
    })
    expect(await repos.songs.get('id-1')).toEqual(song)
  })

  it('stores a tempo, and refuses one outside 30 to 240 BPM', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'Sir Duke', tempo: 104 })
    expect(song.tempo).toBe(104)
    await expect(repos.songs.update(song.id, { tempo: 400 })).rejects.toThrow()
    expect((await repos.songs.get(song.id))?.tempo).toBe(104)
  })

  it('rejects a blank title and stores nothing', async () => {
    const { repos } = makeTestRepos()
    await expect(repos.songs.create({ title: '   ' })).rejects.toThrow()
    expect(await repos.songs.list()).toEqual([])
  })

  it('updates fields and keeps the id', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'Piano Man' })
    const updated = await repos.songs.update(song.id, {
      artist: 'Billy Joel',
      learnedOverride: true,
    })
    expect(updated).toMatchObject({ id: song.id, artist: 'Billy Joel', learnedOverride: true })
  })

  it('throws RecordNotFoundError when updating a missing song', async () => {
    const { repos } = makeTestRepos()
    await expect(repos.songs.update('nope', { title: 'x' })).rejects.toBeInstanceOf(
      RecordNotFoundError,
    )
  })

  it('stores a structure with repeated sections', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'Piano Man' })
    await repos.songs.setStructure(song.id, ['a', 'b', 'a'])
    expect((await repos.songs.get(song.id))?.structure).toEqual(['a', 'b', 'a'])
  })

  it('deletes the song with its sections, goals, attempts and sessions, and nothing else', async () => {
    const { repos } = makeTestRepos()
    const keep = await repos.songs.create({ title: 'Keep' })
    const keepGoal = await repos.goals.create({ songId: keep.id, title: 'Keep goal' })
    await repos.attempts.create({ goalId: keepGoal.id, level: 4 })

    const song = await repos.songs.create({ title: 'Delete me' })
    const section = await repos.sections.create(song.id, { name: 'Verse' })
    const goal = await repos.goals.create({ songId: song.id, sectionId: section.id, title: 'G' })
    await repos.attempts.create({ goalId: goal.id, level: 4 })
    await repos.sessions.startOrResume(song.id)

    await repos.songs.delete(song.id)

    const all = await repos.backup.exportAll()
    expect(all.songs.map((s) => s.id)).toEqual([keep.id])
    expect(all.sections).toEqual([])
    expect(all.goals.map((g) => g.id)).toEqual([keepGoal.id])
    expect(all.attempts).toHaveLength(1)
    expect(all.sessions).toEqual([])
  })
})

describe('sections', () => {
  it('appends sections in order', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'S' })
    await repos.sections.create(song.id, { name: 'Intro' })
    await repos.sections.create(song.id, { name: 'Verse' })
    await repos.sections.create(song.id, { name: 'Chorus' })
    const sections = await repos.sections.listBySong(song.id)
    expect(sections.map((s) => [s.name, s.order])).toEqual([
      ['Intro', 0],
      ['Verse', 1],
      ['Chorus', 2],
    ])
  })

  it('does not reuse an order after a middle section is deleted', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'S' })
    await repos.sections.create(song.id, { name: 'A' })
    const b = await repos.sections.create(song.id, { name: 'B' })
    await repos.sections.create(song.id, { name: 'C' })
    await repos.sections.delete(b.id)
    const d = await repos.sections.create(song.id, { name: 'D' })
    expect(d.order).toBe(3)
  })

  it('refuses a section for a missing song', async () => {
    const { repos } = makeTestRepos()
    await expect(repos.sections.create('nope', { name: 'Verse' })).rejects.toBeInstanceOf(
      RecordNotFoundError,
    )
  })

  it('deleting a section removes its goals, their attempts and every structure slot for it', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'S' })
    const verse = await repos.sections.create(song.id, { name: 'Verse' })
    const chorus = await repos.sections.create(song.id, { name: 'Chorus' })
    await repos.songs.setStructure(song.id, [verse.id, chorus.id, verse.id])
    const verseGoal = await repos.goals.create({ songId: song.id, sectionId: verse.id, title: 'V' })
    const chorusGoal = await repos.goals.create({
      songId: song.id,
      sectionId: chorus.id,
      title: 'C',
    })
    await repos.attempts.create({ goalId: verseGoal.id, level: 4 })
    await repos.attempts.create({ goalId: chorusGoal.id, level: 4 })

    await repos.sections.delete(verse.id)

    expect((await repos.songs.get(song.id))?.structure).toEqual([chorus.id])
    expect((await repos.goals.listBySong(song.id)).map((g) => g.id)).toEqual([chorusGoal.id])
    expect(await repos.attempts.list()).toHaveLength(1)
    expect(await repos.sections.get(verse.id)).toBeUndefined()
  })
})

describe('goals', () => {
  it('creates a whole-song goal by default, with no target tempo', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'S' })
    const goal = await repos.goals.create({ songId: song.id, title: 'Play it through' })
    expect(goal).toMatchObject({ sectionId: null, targetBpm: null, description: '' })
  })

  it('refuses a section that belongs to a different song', async () => {
    const { repos } = makeTestRepos()
    const a = await repos.songs.create({ title: 'A' })
    const b = await repos.songs.create({ title: 'B' })
    const bSection = await repos.sections.create(b.id, { name: 'Verse' })
    await expect(
      repos.goals.create({ songId: a.id, sectionId: bSection.id, title: 'G' }),
    ).rejects.toBeInstanceOf(RecordNotFoundError)
  })

  it('rejects a target tempo outside 30-240', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'S' })
    await expect(
      repos.goals.create({ songId: song.id, title: 'G', targetBpm: 300 }),
    ).rejects.toThrow()
    await expect(
      repos.goals.create({ songId: song.id, title: 'G', targetBpm: 10 }),
    ).rejects.toThrow()
  })

  it('can change or clear the target tempo later', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'S' })
    const goal = await repos.goals.create({ songId: song.id, title: 'G', targetBpm: 120 })
    expect((await repos.goals.update(goal.id, { targetBpm: 90 })).targetBpm).toBe(90)
    expect((await repos.goals.update(goal.id, { targetBpm: null })).targetBpm).toBeNull()
  })

  it('can move a goal to another section of the same song but not to a foreign one', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'S' })
    const other = await repos.songs.create({ title: 'O' })
    const verse = await repos.sections.create(song.id, { name: 'Verse' })
    const foreign = await repos.sections.create(other.id, { name: 'Verse' })
    const goal = await repos.goals.create({ songId: song.id, title: 'G' })
    expect((await repos.goals.update(goal.id, { sectionId: verse.id })).sectionId).toBe(verse.id)
    await expect(repos.goals.update(goal.id, { sectionId: foreign.id })).rejects.toBeInstanceOf(
      RecordNotFoundError,
    )
  })

  it('deleting a goal removes its attempts only', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'S' })
    const a = await repos.goals.create({ songId: song.id, title: 'A' })
    const b = await repos.goals.create({ songId: song.id, title: 'B' })
    await repos.attempts.create({ goalId: a.id, level: 4 })
    await repos.attempts.create({ goalId: b.id, level: 4 })
    await repos.goals.delete(a.id)
    expect((await repos.attempts.list()).map((x) => x.goalId)).toEqual([b.id])
  })
})

describe('attempts', () => {
  async function setup() {
    const ctx = makeTestRepos(1_000)
    const song = await ctx.repos.songs.create({ title: 'S' })
    const goal = await ctx.repos.goals.create({ songId: song.id, title: 'G', targetBpm: 84 })
    return { ...ctx, song, goal }
  }

  it('stamps the time and defaults to no tempo and no session', async () => {
    const { repos, goal } = await setup()
    const attempt = await repos.attempts.create({ goalId: goal.id, level: 3 })
    expect(attempt).toMatchObject({
      goalId: goal.id,
      bpm: null,
      sessionId: null,
      level: 3,
      at: 1_000,
    })
  })

  it("lists a goal's attempts newest first", async () => {
    const { repos, goal, advance } = await setup()
    await repos.attempts.create({ goalId: goal.id, bpm: 60, level: 3 })
    advance(1_000)
    await repos.attempts.create({ goalId: goal.id, bpm: 70, level: 4 })
    advance(1_000)
    await repos.attempts.create({ goalId: goal.id, bpm: 65, level: 4 })
    expect((await repos.attempts.listByGoal(goal.id)).map((a) => a.bpm)).toEqual([65, 70, 60])
  })

  it('lists attempts for a whole song across its goals', async () => {
    const { repos, song, goal } = await setup()
    const second = await repos.goals.create({ songId: song.id, title: 'Second' })
    const other = await repos.songs.create({ title: 'Other' })
    const otherGoal = await repos.goals.create({ songId: other.id, title: 'Elsewhere' })
    await repos.attempts.create({ goalId: goal.id, level: 4 })
    await repos.attempts.create({ goalId: second.id, level: 4 })
    await repos.attempts.create({ goalId: otherGoal.id, level: 4 })
    expect(await repos.attempts.listBySong(song.id)).toHaveLength(2)
  })

  it('refuses an attempt for a missing goal', async () => {
    const { repos } = await setup()
    await expect(repos.attempts.create({ goalId: 'nope', level: 4 })).rejects.toBeInstanceOf(
      RecordNotFoundError,
    )
  })

  it('rejects a tempo out of range and a level out of scale', async () => {
    const { repos, goal } = await setup()
    await expect(repos.attempts.create({ goalId: goal.id, bpm: 500, level: 4 })).rejects.toThrow()
    // @ts-expect-error 6 is not a quality level
    await expect(repos.attempts.create({ goalId: goal.id, level: 6 })).rejects.toThrow()
  })

  it('stores a note, empty by default, and can change it later', async () => {
    const { repos, goal } = await setup()
    const plain = await repos.attempts.create({ goalId: goal.id, level: 3 })
    expect(plain.note).toBe('')
    const noted = await repos.attempts.create({ goalId: goal.id, level: 3, note: 'Bar 3 drags' })
    expect(noted.note).toBe('Bar 3 drags')
    expect(await repos.attempts.update(noted.id, { note: '' })).toMatchObject({ note: '' })
  })

  it('edits and deletes an attempt', async () => {
    const { repos, goal } = await setup()
    const attempt = await repos.attempts.create({ goalId: goal.id, bpm: 60, level: 3 })
    expect(await repos.attempts.update(attempt.id, { bpm: 66, level: 4 })).toMatchObject({
      bpm: 66,
      level: 4,
    })
    await repos.attempts.delete(attempt.id)
    expect(await repos.attempts.list()).toEqual([])
  })
})

describe('sessions', () => {
  async function setup() {
    const ctx = makeTestRepos(0)
    const song = await ctx.repos.songs.create({ title: 'S' })
    return { ...ctx, song }
  }

  it('starts a session stamped with the clock', async () => {
    const { repos, song, advance } = await setup()
    advance(5_000)
    const session = await repos.sessions.startOrResume(song.id)
    expect(session).toMatchObject({ songId: song.id, startedAt: 5_000, pausedMs: 0, endedAt: null })
  })

  it('returns the open session instead of starting another, even when called concurrently', async () => {
    const { repos, song } = await setup()
    const [a, b] = await Promise.all([
      repos.sessions.startOrResume(song.id),
      repos.sessions.startOrResume(song.id),
    ])
    expect(a.id).toBe(b.id)
    expect(await repos.sessions.listBySong(song.id)).toHaveLength(1)
  })

  it('starts a new session once the previous one has ended', async () => {
    const { repos, song } = await setup()
    const first = await repos.sessions.startOrResume(song.id)
    await repos.sessions.end(first.id)
    const second = await repos.sessions.startOrResume(song.id)
    expect(second.id).not.toBe(first.id)
    expect(await repos.sessions.getActive(song.id)).toMatchObject({ id: second.id })
  })

  it('lists every session, oldest first', async () => {
    const { repos, song, advance } = await setup()
    const first = await repos.sessions.startOrResume(song.id)
    await repos.sessions.end(first.id)
    advance(1_000)
    const second = await repos.sessions.startOrResume(song.id)
    expect((await repos.sessions.list()).map((s) => s.id)).toEqual([first.id, second.id])
  })

  it('keeps time across a pause and a reload of the stored session', async () => {
    const { repos, song, advance } = await setup()
    const started = await repos.sessions.startOrResume(song.id)
    advance(10_000)
    await repos.sessions.pause(started.id)
    advance(30_000)
    await repos.sessions.resume(started.id)
    advance(20_000)
    const stored = (await repos.sessions.get(started.id))!
    // 10s + 20s of practice; the 30s pause is excluded.
    expect(sessionElapsedMs(stored, 60_000)).toBe(30_000)
  })

  it('ending while paused does not count the pause', async () => {
    const { repos, song, advance } = await setup()
    const started = await repos.sessions.startOrResume(song.id)
    advance(10_000)
    await repos.sessions.pause(started.id)
    advance(50_000)
    const ended = await repos.sessions.end(started.id)
    expect(ended.endedAt).toBe(60_000)
    expect(sessionElapsedMs(ended, 999_999)).toBe(10_000)
  })

  it('has no active session before one starts, and refuses a missing song', async () => {
    const { repos, song } = await setup()
    expect(await repos.sessions.getActive(song.id)).toBeUndefined()
    await expect(repos.sessions.startOrResume('nope')).rejects.toBeInstanceOf(RecordNotFoundError)
  })
})

describe('backup', () => {
  it('round-trips everything through export and replaceAll', async () => {
    const source = makeTestRepos()
    const song = await source.repos.songs.create({ title: 'S' })
    const section = await source.repos.sections.create(song.id, { name: 'Verse' })
    const goal = await source.repos.goals.create({
      songId: song.id,
      sectionId: section.id,
      title: 'G',
      targetBpm: 90,
    })
    await source.repos.attempts.create({ goalId: goal.id, bpm: 80, level: 4 })
    await source.repos.sessions.startOrResume(song.id)
    const exported = await source.repos.backup.exportAll()

    const target = makeTestRepos()
    await target.repos.backup.replaceAll(exported)
    expect(await target.repos.backup.exportAll()).toEqual(exported)
  })

  it('replaces existing data', async () => {
    const { repos } = makeTestRepos()
    await repos.songs.create({ title: 'Old' })
    await repos.backup.replaceAll({
      songs: [],
      sections: [],
      goals: [],
      attempts: [],
      sessions: [],
    })
    expect(await repos.songs.list()).toEqual([])
  })

  it('rejects invalid data and leaves the database unchanged', async () => {
    const { repos } = makeTestRepos()
    await repos.songs.create({ title: 'Keep' })
    await expect(repos.backup.replaceAll({ songs: [{ id: 'x' }] })).rejects.toThrow()
    expect((await repos.songs.list()).map((s) => s.title)).toEqual(['Keep'])
  })

  it('clears everything', async () => {
    const { repos } = makeTestRepos()
    const song = await repos.songs.create({ title: 'S' })
    await repos.goals.create({ songId: song.id, title: 'G' })
    await repos.backup.clear()
    const all = await repos.backup.exportAll()
    expect(Object.values(all).every((rows) => rows.length === 0)).toBe(true)
  })
})

describe('abandoned sessions', () => {
  const HOUR = 60 * 60 * 1000

  async function setup() {
    const ctx = makeTestRepos(0)
    const song = await ctx.repos.songs.create({ title: 'S' })
    return { ...ctx, song }
  }

  it('resumes a session that is still recent', async () => {
    const { repos, song, advance } = await setup()
    const first = await repos.sessions.startOrResume(song.id)
    advance(11 * HOUR)
    expect((await repos.sessions.startOrResume(song.id)).id).toBe(first.id)
  })

  it('closes a session left open for over 12 hours and starts a fresh one', async () => {
    const { repos, song, advance } = await setup()
    const abandoned = await repos.sessions.startOrResume(song.id)
    advance(13 * HOUR)
    const fresh = await repos.sessions.startOrResume(song.id)

    expect(fresh.id).not.toBe(abandoned.id)
    expect(fresh.startedAt).toBe(13 * HOUR)
    expect((await repos.sessions.get(abandoned.id))?.endedAt).toBe(13 * HOUR)
    expect(await repos.sessions.listBySong(song.id)).toHaveLength(2)
  })

  it('does not report an abandoned session as the active one', async () => {
    const { repos, song, advance } = await setup()
    await repos.sessions.startOrResume(song.id)
    advance(13 * HOUR)
    expect(await repos.sessions.getActive(song.id)).toBeUndefined()
  })
})
