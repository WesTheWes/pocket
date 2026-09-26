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
})
