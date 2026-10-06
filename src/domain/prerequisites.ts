import type { Goal } from './schemas'

/*
 * A goal can ask for other goals of its song to be finished first. It is a soft lock: a way to
 * give a long list of goals a shape, like levels, not a rule. You can always practise and log
 * attempts on a locked goal. Whether a goal is locked right now (which needs attempts) is
 * answered in progress.ts; this file only looks at the requirement graph itself.
 */

/** True if making `goalId` require `requires` would lead round in a circle back to itself. */
export function wouldCycle(goalId: string, requires: string[], goals: Goal[]): boolean {
  const byId = new Map(goals.map((goal) => [goal.id, goal]))
  const seen = new Set<string>()
  const stack = [...requires]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (id === goalId) return true
    if (seen.has(id)) continue
    seen.add(id)
    const goal = byId.get(id)
    if (goal) stack.push(...goal.requires)
  }
  return false
}

/** The ids of goals whose requirements lead back to themselves. */
export function requirementCycles(goals: Goal[]): string[] {
  return goals.filter((goal) => wouldCycle(goal.id, goal.requires, goals)).map((goal) => goal.id)
}

/** "Finish Hands apart first", "Finish A and B first", "Finish A, B and 2 more first". */
export function lockText(blocking: Goal[]): string {
  const titles = blocking.map((goal) => goal.title)
  if (titles.length === 0) return ''
  if (titles.length === 1) return `Finish ${titles[0]} first`
  if (titles.length === 2) return `Finish ${titles[0]} and ${titles[1]} first`
  return `Finish ${titles[0]}, ${titles[1]} and ${titles.length - 2} more first`
}
