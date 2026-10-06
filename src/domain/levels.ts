import { requirementCycles } from './prerequisites'
import { goalDone, goalLocked, orderGoals } from './progress'
import type { Attempt, Goal, Section } from './schemas'

/*
 * Levels give a song's goals the shape of a game: a goal's level is how deep it sits in the
 * "finish first" graph. Goals that need nothing are level 1; a goal is one level above the
 * highest goal it requires. Nothing is stored: it all follows from `Goal.requires`.
 */

/** Every goal's level, by id. Goals in a circle (which the data layer refuses) are level 1. */
export function goalLevels(goals: Goal[]): Map<string, number> {
  const byId = new Map(goals.map((goal) => [goal.id, goal]))
  const circular = new Set(requirementCycles(goals))
  const levels = new Map<string, number>()
  const visit = (goal: Goal, trail: Set<string>): number => {
    const known = levels.get(goal.id)
    if (known !== undefined) return known
    if (circular.has(goal.id) || trail.has(goal.id)) return 1
    trail.add(goal.id)
    let level = 1
    for (const id of goal.requires) {
      const required = byId.get(id)
      if (required) level = Math.max(level, visit(required, trail) + 1)
    }
    trail.delete(goal.id)
    levels.set(goal.id, level)
    return level
  }
  for (const goal of goals) visit(goal, new Set())
  return levels
}

export function goalLevel(goal: Goal, goals: Goal[]): number {
  return goalLevels(goals).get(goal.id) ?? 1
}

export interface Level {
  level: number
  /** In `orderGoals` order. */
  goals: Goal[]
}

/**
 * The song's goals grouped by level, lowest first; within a level, section goals in play order
 * and whole-song goals last (the song is put together last). Empty for a song with no goals.
 */
export function songLevels(goals: Goal[], sections: Section[]): Level[] {
  const levels = goalLevels(goals)
  const grouped = new Map<number, Goal[]>()
  const ordered = orderGoals(goals, sections)
  const inLevelOrder = [
    ...ordered.filter((goal) => goal.sectionId !== null),
    ...ordered.filter((goal) => goal.sectionId === null),
  ]
  for (const goal of inLevelOrder) {
    const level = levels.get(goal.id) ?? 1
    grouped.set(level, [...(grouped.get(level) ?? []), goal])
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, levelGoals]) => ({ level, goals: levelGoals }))
}

/** Every goal in path order: level by level, as `songLevels` lists them. */
export function pathOrder(goals: Goal[], sections: Section[]): Goal[] {
  return songLevels(goals, sections).flatMap((level) => level.goals)
}

/**
 * The next open goal (not done, not locked) after `goal` on the path, wrapping round to the
 * first open one; undefined when nothing is open.
 */
export function nextOnPath(
  goal: Goal,
  goals: Goal[],
  sections: Section[],
  attempts: Attempt[],
): Goal | undefined {
  const path = pathOrder(goals, sections)
  const index = path.findIndex((other) => other.id === goal.id)
  const after = index === -1 ? path : [...path.slice(index + 1), ...path.slice(0, index)]
  return after.find((other) => !goalDone(other, attempts) && !goalLocked(other, goals, attempts))
}

/** The lowest level with something still to do; the top level once everything is done. */
export function currentLevel(goals: Goal[], attempts: Attempt[]): number {
  const levels = songLevels(goals, [])
  const open = levels.find((level) => level.goals.some((goal) => !goalDone(goal, attempts)))
  return open?.level ?? levels[levels.length - 1]?.level ?? 1
}

/** How many levels the song has (at least 1). */
export function levelCount(goals: Goal[]): number {
  const levels = songLevels(goals, [])
  return levels[levels.length - 1]?.level ?? 1
}
