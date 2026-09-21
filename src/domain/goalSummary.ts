import { fastestSolidBpm } from './progress'
import { isSolid } from './quality'
import type { Attempt, Goal } from './schemas'

/** The one line under a goal's progress bar. Goal cards show progress, never a bare rating. */
export function goalSummary(goal: Goal, attempts: Attempt[]): string {
  const solid = attempts.filter((a) => a.goalId === goal.id && isSolid(a.level))

  if (goal.targetBpm === null) {
    return solid.length > 0 ? 'Solid attempt logged' : 'No Solid attempt yet'
  }

  const fastest = fastestSolidBpm(goal, attempts)
  if (fastest !== null) return `fastest Solid ${fastest} of ${goal.targetBpm} BPM`
  return solid.length > 0 ? 'Solid attempt logged without a tempo' : 'No Solid attempt yet'
}
