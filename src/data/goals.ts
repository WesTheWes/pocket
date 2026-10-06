import { wouldCycle } from '../domain/prerequisites'
import { goalSchema, type Goal, type Resource } from '../domain/schemas'
import { RecordNotFoundError, updateRecord, type RepoContext } from './context'

/** Thrown when a goal's requirements would lead round in a circle back to itself. */
export class RequirementCycleError extends Error {
  constructor() {
    super('These goals would require each other in a circle.')
    this.name = 'RequirementCycleError'
  }
}

export interface NewGoal {
  songId: string
  /** Null or omitted means the goal covers the whole song. */
  sectionId?: string | null
  title: string
  description?: string
  targetBpm?: number | null
  /** Goals of the same song to finish first. */
  requires?: string[]
  resources?: Resource[]
}

export type GoalPatch = Partial<
  Pick<Goal, 'sectionId' | 'title' | 'description' | 'targetBpm' | 'requires' | 'resources'>
>

export function createGoalsRepo({ db, now, newId }: RepoContext) {
  async function assertSectionInSong(sectionId: string | null, songId: string) {
    if (sectionId === null) return
    const section = await db.sections.get(sectionId)
    if (!section || section.songId !== songId) throw new RecordNotFoundError('section', sectionId)
  }

  /** Each required goal must be another goal of the same song, and must not lead back here. */
  async function assertRequirements(goalId: string | null, songId: string, requires: string[]) {
    for (const id of requires) {
      if (id === goalId) throw new RequirementCycleError()
      const required = await db.goals.get(id)
      if (!required || required.songId !== songId) throw new RecordNotFoundError('goal', id)
    }
    if (goalId !== null) {
      const goals = await db.goals.where('songId').equals(songId).toArray()
      if (wouldCycle(goalId, requires, goals)) throw new RequirementCycleError()
    }
  }

  const unique = (ids: string[]) => [...new Set(ids)]

  return {
    list: () => db.goals.toArray(),

    listBySong: (songId: string) => db.goals.where('songId').equals(songId).toArray(),

    get: (id: string) => db.goals.get(id),

    async create(input: NewGoal): Promise<Goal> {
      return db.transaction('rw', [db.songs, db.sections, db.goals], async () => {
        if (!(await db.songs.get(input.songId))) throw new RecordNotFoundError('song', input.songId)
        const sectionId = input.sectionId ?? null
        await assertSectionInSong(sectionId, input.songId)
        const requires = unique(input.requires ?? [])
        await assertRequirements(null, input.songId, requires)
        const goal = goalSchema.parse({
          id: newId(),
          songId: input.songId,
          sectionId,
          title: input.title,
          description: input.description ?? '',
          targetBpm: input.targetBpm ?? null,
          requires,
          resources: input.resources ?? [],
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
        if (patch.requires !== undefined) {
          patch = { ...patch, requires: unique(patch.requires) }
          await assertRequirements(id, current.songId, patch.requires!)
        }
        return updateRecord(db.goals, goalSchema, 'goal', id, patch)
      })
    },

    /** Removes the goal and its attempts, and drops it from other goals' requirements. */
    async delete(id: string): Promise<void> {
      await db.transaction('rw', [db.goals, db.attempts], async () => {
        const goal = await db.goals.get(id)
        if (!goal) return
        await db.attempts.where('goalId').equals(id).delete()
        await db.goals.delete(id)
        await dropRequirements(db, goal.songId, [id])
      })
    },
  }
}

/** Removes the given goals from the requirements of the song's remaining goals. */
export async function dropRequirements(db: RepoContext['db'], songId: string, ids: string[]) {
  const gone = new Set(ids)
  await db.goals
    .where('songId')
    .equals(songId)
    .filter((goal) => goal.requires.some((id) => gone.has(id)))
    .modify((goal) => {
      goal.requires = goal.requires.filter((id) => !gone.has(id))
    })
}
