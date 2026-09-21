import { goalSchema, type Goal } from '../domain/schemas'
import { RecordNotFoundError, updateRecord, type RepoContext } from './context'

export interface NewGoal {
  songId: string
  /** Null or omitted means the goal covers the whole song. */
  sectionId?: string | null
  title: string
  description?: string
  targetBpm?: number | null
}

export type GoalPatch = Partial<Pick<Goal, 'sectionId' | 'title' | 'description' | 'targetBpm'>>

export function createGoalsRepo({ db, now, newId }: RepoContext) {
  async function assertSectionInSong(sectionId: string | null, songId: string) {
    if (sectionId === null) return
    const section = await db.sections.get(sectionId)
    if (!section || section.songId !== songId) throw new RecordNotFoundError('section', sectionId)
  }

  return {
    list: () => db.goals.toArray(),

    listBySong: (songId: string) => db.goals.where('songId').equals(songId).toArray(),

    get: (id: string) => db.goals.get(id),

    async create(input: NewGoal): Promise<Goal> {
      return db.transaction('rw', [db.songs, db.sections, db.goals], async () => {
        if (!(await db.songs.get(input.songId))) throw new RecordNotFoundError('song', input.songId)
        const sectionId = input.sectionId ?? null
        await assertSectionInSong(sectionId, input.songId)
        const goal = goalSchema.parse({
          id: newId(),
          songId: input.songId,
          sectionId,
          title: input.title,
          description: input.description ?? '',
          targetBpm: input.targetBpm ?? null,
          createdAt: now(),
        })
        await db.goals.add(goal)
        return goal
      })
    },

    /** The target tempo can be changed at any time; progress is recomputed from attempts. */
    async update(id: string, patch: GoalPatch): Promise<Goal> {
      return db.transaction('rw', [db.sections, db.goals], async () => {
        const current = await db.goals.get(id)
        if (!current) throw new RecordNotFoundError('goal', id)
        if (patch.sectionId !== undefined)
          await assertSectionInSong(patch.sectionId, current.songId)
        return updateRecord(db.goals, goalSchema, 'goal', id, patch)
      })
    },

    /** Removes the goal and its attempts. */
    async delete(id: string): Promise<void> {
      await db.transaction('rw', [db.goals, db.attempts], async () => {
        await db.attempts.where('goalId').equals(id).delete()
        await db.goals.delete(id)
      })
    },
  }
}
