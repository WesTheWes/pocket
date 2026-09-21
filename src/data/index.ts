import { createAttemptsRepo } from './attempts'
import { createBackupRepo } from './backup'
import type { RepoContext } from './context'
import { createDb } from './db'
import { createGoalsRepo } from './goals'
import { createSectionsRepo } from './sections'
import { createSessionsRepo } from './sessions'
import { createSongsRepo } from './songs'

export function createRepositories(context: RepoContext) {
  return {
    songs: createSongsRepo(context),
    sections: createSectionsRepo(context),
    goals: createGoalsRepo(context),
    attempts: createAttemptsRepo(context),
    sessions: createSessionsRepo(context),
    backup: createBackupRepo(context),
  }
}

export type Repositories = ReturnType<typeof createRepositories>

export { RecordNotFoundError } from './context'

/** The app's repositories. Screens read through the hooks in `./hooks`, and write through this. */
export const repos = createRepositories({
  db: createDb(),
  now: () => Date.now(),
  newId: () => crypto.randomUUID(),
})
