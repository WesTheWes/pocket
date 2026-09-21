import { pocketDataSchema, type PocketData } from '../domain/schemas'
import type { RepoContext } from './context'

/** Whole-database operations, used for sample data now and JSON export/import later. */
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
      const data = pocketDataSchema.parse(input)
      await db.transaction('rw', tables, async () => {
        await Promise.all(tables.map((table) => table.clear()))
        await db.songs.bulkAdd(data.songs)
        await db.sections.bulkAdd(data.sections)
        await db.goals.bulkAdd(data.goals)
        await db.attempts.bulkAdd(data.attempts)
        await db.sessions.bulkAdd(data.sessions)
      })
    },

    async clear(): Promise<void> {
      await db.transaction('rw', tables, () => Promise.all(tables.map((table) => table.clear())))
    },
  }
}
