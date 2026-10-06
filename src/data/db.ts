import Dexie, { type Table } from 'dexie'
import type { Attempt, Goal, Section, Session, Song } from '../domain/schemas'

export type PocketDb = Dexie & {
  songs: Table<Song, string>
  sections: Table<Section, string>
  goals: Table<Goal, string>
  attempts: Table<Attempt, string>
  sessions: Table<Session, string>
}

/** Only the first entry is the primary key; the rest are indexes we query by. */
export function createDb(name = 'pocket'): PocketDb {
  const db = new Dexie(name) as PocketDb
  db.version(1).stores({
    songs: 'id, createdAt',
    sections: 'id, songId',
    goals: 'id, songId, sectionId',
    attempts: 'id, goalId, sessionId, at',
    sessions: 'id, songId, startedAt',
  })
  // Version 2 gave songs a tempo. Songs saved before then have none.
  db.version(2).upgrade((tx) =>
    tx
      .table('songs')
      .toCollection()
      .modify((song: Partial<Song>) => {
        if (song.tempo === undefined) song.tempo = null
      }),
  )
  // Version 3 gave attempts a note. Attempts saved before then have an empty one.
  db.version(3).upgrade((tx) =>
    tx
      .table('attempts')
      .toCollection()
      .modify((attempt: Partial<Attempt>) => {
        if (attempt.note === undefined) attempt.note = ''
      }),
  )
  return db
}
