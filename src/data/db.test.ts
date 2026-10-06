import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { createDb } from './db'

describe('createDb', () => {
  it('gives songs saved before version 2 an empty tempo', async () => {
    const name = 'upgrade-test'
    // The database as version 1 left it: a song with no tempo field.
    const old = new Dexie(name)
    old.version(1).stores({
      songs: 'id, createdAt',
      sections: 'id, songId',
      goals: 'id, songId, sectionId',
      attempts: 'id, goalId, sessionId, at',
      sessions: 'id, songId, startedAt',
    })
    await old.table('songs').add({
      id: 's1',
      title: 'Piano Man',
      artist: 'Billy Joel',
      chordNotes: '',
      structure: [],
      learnedOverride: false,
      createdAt: 0,
    })
    old.close()

    const db = createDb(name)
    expect(await db.songs.get('s1')).toMatchObject({ title: 'Piano Man', tempo: null })
    db.close()
    await Dexie.delete(name)
  })

  it('gives attempts saved before version 3 an empty note', async () => {
    const name = 'upgrade-test-3'
    // The database as version 2 left it: an attempt with no note field.
    const old = new Dexie(name)
    old.version(2).stores({
      songs: 'id, createdAt',
      sections: 'id, songId',
      goals: 'id, songId, sectionId',
      attempts: 'id, goalId, sessionId, at',
      sessions: 'id, songId, startedAt',
    })
    await old.table('attempts').add({
      id: 't1',
      goalId: 'g1',
      sessionId: null,
      bpm: 60,
      level: 4,
      at: 0,
    })
    old.close()

    const db = createDb(name)
    expect(await db.attempts.get('t1')).toMatchObject({ bpm: 60, note: '' })
    db.close()
    await Dexie.delete(name)
  })

  it('gives goals saved before version 4 no requirements', async () => {
    const name = 'upgrade-test-4'
    // The database as version 3 left it: a goal with no requires field.
    const old = new Dexie(name)
    old.version(3).stores({
      songs: 'id, createdAt',
      sections: 'id, songId',
      goals: 'id, songId, sectionId',
      attempts: 'id, goalId, sessionId, at',
      sessions: 'id, songId, startedAt',
    })
    await old.table('goals').add({
      id: 'g1',
      songId: 's1',
      sectionId: null,
      title: 'G',
      description: '',
      targetBpm: null,
      createdAt: 0,
    })
    old.close()

    const db = createDb(name)
    expect(await db.goals.get('g1')).toMatchObject({ title: 'G', requires: [] })
    db.close()
    await Dexie.delete(name)
  })

  it('gives songs and goals saved before version 5 no links', async () => {
    const name = 'upgrade-test-5'
    const old = new Dexie(name)
    old.version(4).stores({
      songs: 'id, createdAt',
      sections: 'id, songId',
      goals: 'id, songId, sectionId',
      attempts: 'id, goalId, sessionId, at',
      sessions: 'id, songId, startedAt',
    })
    await old.table('songs').add({
      id: 's1',
      title: 'S',
      artist: '',
      chordNotes: '',
      tempo: null,
      structure: [],
      learnedOverride: false,
      createdAt: 0,
    })
    await old.table('goals').add({
      id: 'g1',
      songId: 's1',
      sectionId: null,
      title: 'G',
      description: '',
      targetBpm: null,
      requires: [],
      createdAt: 0,
    })
    old.close()

    const db = createDb(name)
    expect(await db.songs.get('s1')).toMatchObject({ resources: [] })
    expect(await db.goals.get('g1')).toMatchObject({ resources: [] })
    db.close()
    await Dexie.delete(name)
  })
})
