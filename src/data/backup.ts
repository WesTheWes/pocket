import { checkIntegrity, mergeMissing, type MergeResult } from '../domain/backup'
import { pocketDataSchema, type PocketData } from '../domain/schemas'
import type { RepoContext } from './context'

/** The shape must be right and the pieces must fit together, or nothing is written. */
function validate(input: unknown): PocketData {
  const data = pocketDataSchema.parse(input)
  const problems = checkIntegrity(data)
  if (problems.length > 0) {
    throw new Error(`The data is inconsistent. ${problems.slice(0, 3).join(' ')}`)
  }
  return data
}

/** Whole-database operations, used for sample data, JSON backup and restore. */
export function createBackupRepo({ db }: RepoContext) {
  const tables = [db.songs, db.sections, db.goals, db.attempts, db.sessions]

  return {
    exportAll(): Promise<PocketData> {
      return db.transaction('r', tables, async () => ({
        songs: await db.songs.toArray(),
        sections: await db.sections.toArray(),
        goals: await db.goals.toArray(),
        attempts: await db.attempts.toArray(),
        sessions: await db.sessions.toArray(),
      }))
    },

    /** Validates first, then swaps everything in one transaction. Invalid input changes nothing. */
    async replaceAll(input: unknown): Promise<void> {
      const data = validate(input)
      await db.transaction('rw', tables, async () => {
        await Promise.all(tables.map((table) => table.clear()))
        await db.songs.bulkAdd(data.songs)
        await db.sections.bulkAdd(data.sections)
        await db.goals.bulkAdd(data.goals)
        await db.attempts.bulkAdd(data.attempts)
        await db.sessions.bulkAdd(data.sessions)
      })
    },

    /**
     * Adds the songs in `input` that this database does not have, each with everything that
     * belongs to it. Songs already here are left entirely alone, so nothing is overwritten. All or
     * nothing: if any part cannot be added, none of it is.
     */
    async addMissing(input: unknown): Promise<MergeResult> {
      const data = validate(input)
      return db.transaction('rw', tables, async () => {
        const existing = new Set(await db.songs.toCollection().primaryKeys())
        const result = mergeMissing(existing, data)
        await db.songs.bulkAdd(result.additions.songs)
        await db.sections.bulkAdd(result.additions.sections)
        await db.goals.bulkAdd(result.additions.goals)
        await db.attempts.bulkAdd(result.additions.attempts)
        await db.sessions.bulkAdd(result.additions.sessions)
        return result
      })
    },

    async clear(): Promise<void> {
      await db.transaction('rw', tables, () => Promise.all(tables.map((table) => table.clear())))
    },
  }
}
