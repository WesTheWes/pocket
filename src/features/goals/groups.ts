import { goalDone } from '../../domain/progress'
import type { Attempt, Goal, Section } from '../../domain/schemas'

export type GoalFilter = 'all' | 'todo' | 'done'

export interface GoalGroup {
  key: string
  title: string
  /** Null for the "Whole song" group. */
  sectionId: string | null
  goals: Goal[]
}

export function filterCounts(goals: Goal[], attempts: Attempt[]) {
  const done = goals.filter((goal) => goalDone(goal, attempts)).length
  return { all: goals.length, todo: goals.length - done, done }
}

/**
 * Goals grouped under "Whole song" and then each section in order. With the "all" filter every
 * group is listed, even an empty one, so it still has its add button. Other filters hide empty
 * groups.
 */
export function groupGoals(
  goals: Goal[],
  sections: Section[],
  attempts: Attempt[],
  filter: GoalFilter,
): GoalGroup[] {
  const keep = (goal: Goal) => filter === 'all' || (filter === 'done') === goalDone(goal, attempts)
  const inGroup = (sectionId: string | null) =>
    goals
      .filter((goal) => goal.sectionId === sectionId && keep(goal))
      .sort((a, b) => a.createdAt - b.createdAt)

  const groups: GoalGroup[] = [
    { key: 'whole', title: 'Whole song', sectionId: null, goals: inGroup(null) },
    ...[...sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        key: section.id,
        title: section.name,
        sectionId: section.id,
        goals: inGroup(section.id),
      })),
  ]
  return filter === 'all' ? groups : groups.filter((group) => group.goals.length > 0)
}
