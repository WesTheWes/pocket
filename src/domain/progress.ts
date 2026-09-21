import { isSolid } from './quality'
import type { Attempt, Goal, Section, Song } from './schemas'

export type SongStatus = 'learned' | 'in-progress'

const DEFAULT_STARTING_BPM = 80

function attemptsFor(goal: Goal, attempts: Attempt[]): Attempt[] {
  return attempts.filter((attempt) => attempt.goalId === goal.id)
}

/** The fastest tempo the goal has been played at Solid or better, or null if none. */
export function fastestSolidBpm(goal: Goal, attempts: Attempt[]): number | null {
  let fastest: number | null = null
  for (const attempt of attemptsFor(goal, attempts)) {
    if (attempt.bpm === null || !isSolid(attempt.level)) continue
    if (fastest === null || attempt.bpm > fastest) fastest = attempt.bpm
  }
  return fastest
}

/**
 * A goal is done when a Solid or better attempt reaches its target tempo.
 * With no target tempo, any Solid or better attempt does it.
 */
export function goalDone(goal: Goal, attempts: Attempt[]): boolean {
  if (goal.targetBpm === null) {
    return attemptsFor(goal, attempts).some((attempt) => isSolid(attempt.level))
  }
  const fastest = fastestSolidBpm(goal, attempts)
  return fastest !== null && fastest >= goal.targetBpm
}

/** 0 to 1: fastest Solid tempo over the target tempo. */
export function goalProgress(goal: Goal, attempts: Attempt[]): number {
  if (goalDone(goal, attempts)) return 1
  if (goal.targetBpm === null) return 0
  return (fastestSolidBpm(goal, attempts) ?? 0) / goal.targetBpm
}

/** Average progress of the given goals, 0 to 1. Pass a section's goals or a song's goals. */
export function averageProgress(goals: Goal[], attempts: Attempt[]): number {
  if (goals.length === 0) return 0
  const total = goals.reduce((sum, goal) => sum + goalProgress(goal, attempts), 0)
  return total / goals.length
}

export function doneCount(goals: Goal[], attempts: Attempt[]): number {
  return goals.filter((goal) => goalDone(goal, attempts)).length
}

/** Learned when every goal is done (and there is at least one), or when marked by hand. */
export function songStatus(song: Song, goals: Goal[], attempts: Attempt[]): SongStatus {
  if (song.learnedOverride) return 'learned'
  const allDone = goals.length > 0 && goals.every((goal) => goalDone(goal, attempts))
  return allDone ? 'learned' : 'in-progress'
}

/** Whole-song goals first, then each section in order, then oldest goal first. */
export function orderGoals(goals: Goal[], sections: Section[]): Goal[] {
  const sectionOrder = new Map(sections.map((section) => [section.id, section.order]))
  const rank = (goal: Goal) =>
    goal.sectionId === null ? -1 : (sectionOrder.get(goal.sectionId) ?? Infinity)
  return [...goals].sort((a, b) => rank(a) - rank(b) || a.createdAt - b.createdAt)
}

/** The first goal that is not done, or the first goal when everything is done. */
export function firstUnfinishedGoal(goals: Goal[], attempts: Attempt[]): Goal | undefined {
  return goals.find((goal) => !goalDone(goal, attempts)) ?? goals[0]
}

/** Metronome tempo when landing on a goal: last logged, else the target, else 80. */
export function startingBpm(goal: Goal, attempts: Attempt[]): number {
  let latest: Attempt | undefined
  for (const attempt of attemptsFor(goal, attempts)) {
    if (attempt.bpm === null) continue
    if (latest === undefined || attempt.at > latest.at) latest = attempt
  }
  return latest?.bpm ?? goal.targetBpm ?? DEFAULT_STARTING_BPM
}
