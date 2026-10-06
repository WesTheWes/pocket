import { sectionSchema, songSchema, type Section } from '../domain/schemas'
import { dropRequirements } from './goals'
import { RecordNotFoundError, updateRecord, type RepoContext } from './context'

export interface NewSection {
  name: string
  notes?: string
}

export type SectionPatch = Partial<Pick<Section, 'name' | 'notes'>>

export function createSectionsRepo({ db, newId }: RepoContext) {
  return {
    list: () => db.sections.toArray(),

    /** A song's sections in their own order (not the play order in `Song.structure`). */
    listBySong: (songId: string) => db.sections.where('songId').equals(songId).sortBy('order'),

    get: (id: string) => db.sections.get(id),

    /** Adds the section after the song's existing ones. It is not added to the structure. */
    async create(songId: string, input: NewSection): Promise<Section> {
      return db.transaction('rw', [db.songs, db.sections], async () => {
        if (!(await db.songs.get(songId))) throw new RecordNotFoundError('song', songId)
        const existing = await db.sections.where('songId').equals(songId).toArray()
        const order = existing.reduce((max, section) => Math.max(max, section.order + 1), 0)
        const section = sectionSchema.parse({
          id: newId(),
          songId,
          name: input.name,
          notes: input.notes ?? '',
          order,
        })
        await db.sections.add(section)
        return section
      })
    },

    update: (id: string, patch: SectionPatch) =>
      updateRecord(db.sections, sectionSchema, 'section', id, patch),

    /** Removes the section, its goals and their attempts, and every slot for it in the structure. */
    async delete(id: string): Promise<void> {
      await db.transaction('rw', [db.songs, db.sections, db.goals, db.attempts], async () => {
        const section = await db.sections.get(id)
        if (!section) return
        const goalIds = await db.goals.where('sectionId').equals(id).primaryKeys()
        await db.attempts.where('goalId').anyOf(goalIds).delete()
        await db.goals.where('sectionId').equals(id).delete()
        await dropRequirements(db, section.songId, goalIds)
        const song = await db.songs.get(section.songId)
        if (song) {
          const structure = song.structure.filter((sectionId) => sectionId !== id)
          await db.songs.put(songSchema.parse({ ...song, structure }))
        }
        await db.sections.delete(id)
      })
    },
  }
}
