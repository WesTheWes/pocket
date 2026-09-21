import { createRepositories } from '../data'
import { createDb } from '../data/db'

let dbCount = 0

/**
 * Fresh in-memory repositories with a manual clock and predictable IDs (id-1, id-2, ...). Give
 * a second database a different `idPrefix` when a test moves data between two of them.
 */
export function makeTestRepos(startTime = 1_000, idPrefix = 'id') {
  let time = startTime
  let idCount = 0
  const repos = createRepositories({
    db: createDb(`test-${++dbCount}`),
    now: () => time,
    newId: () => `${idPrefix}-${++idCount}`,
  })
  return {
    repos,
    advance(ms: number) {
      time += ms
    },
  }
}
