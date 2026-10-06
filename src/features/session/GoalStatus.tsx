import { Icon } from '../../components/Icon'
import { goalDone, goalLocked, goalProgress, toPercent } from '../../domain/progress'
import type { Attempt, Goal } from '../../domain/schemas'

/**
 * A goal's state at a glance for the Practice lists: a yellow Done, or its percentage, with a
 * lock beside it while the goals it requires are not done.
 */
export function GoalStatus({
  goal,
  goals,
  attempts,
}: {
  goal: Goal
  /** Every goal of the song, to know whether what this one requires is done. */
  goals: Goal[]
  attempts: Attempt[]
}) {
  if (goalDone(goal, attempts)) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-yellow">
        <Icon name="check" size={14} />
        Done
      </span>
    )
  }
  const percent = `${toPercent(goalProgress(goal, attempts))}%`
  if (goalLocked(goal, goals, attempts)) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted">
        <Icon name="lock" size={12} />
        <span className="sr-only">Locked, </span>
        {percent}
      </span>
    )
  }
  return <span className="shrink-0 text-xs tabular-nums">{percent}</span>
}
