import { Icon } from '../../components/Icon'
import { goalDone, goalProgress, toPercent } from '../../domain/progress'
import type { Attempt, Goal } from '../../domain/schemas'

/** A goal's state at a glance for the Practice lists: a yellow Done, or its percentage. */
export function GoalStatus({ goal, attempts }: { goal: Goal; attempts: Attempt[] }) {
  if (goalDone(goal, attempts)) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-yellow">
        <Icon name="check" size={14} />
        Done
      </span>
    )
  }
  return (
    <span className="shrink-0 text-xs tabular-nums">
      {toPercent(goalProgress(goal, attempts))}%
    </span>
  )
}
