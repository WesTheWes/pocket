import { songSchema, type Song } from '../domain/schemas'
import { updateRecord, type RepoContext } from './context'

export interface NewSong {
  title: string
  artist?: string
  chordNotes?: string
  tempo?: number | null
}

export type SongPatch = Partial<
  Pick<Song, 'title' | 'artist' | 'chordNotes' | 'tempo' | 'learnedOverride'>
>

export function createSongsRepo({ db, now, newId }: RepoContext) {
  return {
    list: () => db.songs.toArray(),

    get: (id: string) => db.songs.get(id),

    async create(input: NewSong): Promise<Song> {
      const song = songSchema.parse({
        id: newId(),
        title: input.title,
        artist: input.artist ?? '',
        chordNotes: input.chordNotes ?? '',
        tempo: input.tempo ?? null,
        structure: [],
        learnedOverride: false,
        createdAt: now(),
      })
      await db.songs.add(song)
      return song
    },

    update: (id: string, patch: SongPatch) => updateRecord(db.songs, songSchema, 'song', id, patch),

    /** Replace the play order. A section may appear more than once. */
    setStructure: (id: string, structure: string[]) =>
      updateRecord(db.songs, songSchema, 'song', id, { structure }),

    /** Deletes the song and everything that belongs to it. */
    async delete(id: string): Promise<void> {
      await db.transaction(
        'rw',
        [db.songs, db.sections, db.goals, db.attempts, db.sessions],
        async () => {
          const goalIds = await db.goals.where('songId').equals(id).primaryKeys()
          await db.attempts.where('goalId').anyOf(goalIds).delete()
          await db.goals.where('songId').equals(id).delete()
          await db.sections.where('songId').equals(id).delete()
          await db.sessions.where('songId').equals(id).delete()
          await db.songs.delete(id)
        },
      )
    },
  }
}
