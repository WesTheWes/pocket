import { attemptSchema, type Attempt } from '../domain/schemas'
import { RecordNotFoundError, updateRecord, type RepoContext } from './context'

export interface NewAttempt {
  goalId: string
  /** Null or omitted when no tempo was played. */
  bpm?: number | null
  level: Attempt['level']
  /** Set when the attempt is logged during a practice session. */
  sessionId?: string | null
  /** What went wrong or what to try next. Omitted when nothing was written. */
  note?: string
}

export type AttemptPatch = Partial<Pick<Attempt, 'bpm' | 'level' | 'note'>>

export function createAttemptsRepo({ db, now, newId }: RepoContext) {
  return {
    list: () => db.attempts.toArray(),

    /** Newest first, for history lists. */
    listByGoal: (goalId: string) =>
      db.attempts.where('goalId').equals(goalId).reverse().sortBy('at'),

    /** Every attempt for every goal in the song. */
    async listBySong(songId: string): Promise<Attempt[]> {
      const goalIds = await db.goals.where('songId').equals(songId).primaryKeys()
      return db.attempts.where('goalId').anyOf(goalIds).toArray()
    },

    async create(input: NewAttempt): Promise<Attempt> {
      return db.transaction('rw', [db.goals, db.attempts], async () => {
        if (!(await db.goals.get(input.goalId))) throw new RecordNotFoundError('goal', input.goalId)
        const attempt = attemptSchema.parse({
          id: newId(),
          goalId: input.goalId,
          sessionId: input.sessionId ?? null,
          bpm: input.bpm ?? null,
          level: input.level,
          note: input.note ?? '',
          at: now(),
        })
        await db.attempts.add(attempt)
        return attempt
      })
    },

    update: (id: string, patch: AttemptPatch) =>
      updateRecord(db.attempts, attemptSchema, 'attempt', id, patch),

    delete: (id: string) => db.attempts.delete(id),
  }
}
