import type { Table } from 'dexie'
import type { z } from 'zod'
import type { PocketDb } from './db'

/** What every repository needs. The clock and ID source are injected so tests are deterministic. */
export interface RepoContext {
  db: PocketDb
  now: () => number
  newId: () => string
}

/**
 * Not named `NotFoundError`: Dexie converts any error with that name thrown inside a transaction
 * into its own DexieError, which would break `instanceof` checks.
 */
export class RecordNotFoundError extends Error {
  constructor(kind: string, id: string) {
    super(`${kind} not found: ${id}`)
    this.name = 'RecordNotFoundError'
  }
}

/** Load, merge a patch, validate, and save, atomically. `id` is never patched. */
export async function updateRecord<T extends { id: string }>(
  table: Table<T, string>,
  schema: z.ZodType<T>,
  kind: string,
  id: string,
  patch: Partial<Omit<T, 'id'>>,
): Promise<T> {
  return table.db.transaction('rw', table, async () => {
    const current = await table.get(id)
    if (!current) throw new RecordNotFoundError(kind, id)
    const next = schema.parse({ ...current, ...patch, id })
    await table.put(next)
    return next
  })
}
