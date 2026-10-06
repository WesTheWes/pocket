import { lockText } from './prerequisites'
import { isSolid } from './quality'
import { MIN_BPM, type Attempt, type Goal, type Section, type Song } from './schemas'

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

/**
 * Whole-song goals first, then each section in order, then oldest goal first; except that a goal
 * always comes after the goals it requires (the earliest place that allows it).
 */
export function orderGoals(goals: Goal[], sections: Section[]): Goal[] {
  const sectionOrder = new Map(sections.map((section) => [section.id, section.order]))
  const rank = (goal: Goal) =>
    goal.sectionId === null ? -1 : (sectionOrder.get(goal.sectionId) ?? Infinity)
  const sorted = [...goals].sort((a, b) => rank(a) - rank(b) || a.createdAt - b.createdAt)

  const ids = new Set(sorted.map((goal) => goal.id))
  const placed = new Set<string>()
  const ordered: Goal[] = []
  while (ordered.length < sorted.length) {
    const ready = (goal: Goal) =>
      !placed.has(goal.id) && goal.requires.every((id) => !ids.has(id) || placed.has(id))
    // A circle of requirements (which the data layer refuses) falls back to the plain order.
    const next = sorted.find(ready) ?? sorted.find((goal) => !placed.has(goal.id))!
    placed.add(next.id)
    ordered.push(next)
  }
  return ordered
}

/** The goals that `goal` asks you to finish first and that are not done. Unknown ids are ignored. */
export function blockingGoals(goal: Goal, goals: Goal[], attempts: Attempt[]): Goal[] {
  const byId = new Map(goals.map((g) => [g.id, g]))
  return goal.requires.flatMap((id) => {
    const required = byId.get(id)
    return required && !goalDone(required, attempts) ? [required] : []
  })
}

/**
 * Locked: not done, and something it requires is not done either. A soft lock: attempts still
 * count, and once the goal itself is done the lock no longer matters.
 */
export function goalLocked(goal: Goal, goals: Goal[], attempts: Attempt[]): boolean {
  return !goalDone(goal, attempts) && blockingGoals(goal, goals, attempts).length > 0
}

/** "Finish Hands apart first" while the goal is locked, else undefined. */
export function lockReason(goal: Goal, goals: Goal[], attempts: Attempt[]): string | undefined {
  return goalLocked(goal, goals, attempts)
    ? lockText(blockingGoals(goal, goals, attempts))
    : undefined
}

/**
 * Where to start: the first goal that is neither done nor locked; failing that, the first goal
 * that is not done; failing that, the first goal.
 */
export function firstUnfinishedGoal(goals: Goal[], attempts: Attempt[]): Goal | undefined {
  const open = goals.filter((goal) => !goalDone(goal, attempts))
  return open.find((goal) => !goalLocked(goal, goals, attempts)) ?? open[0] ?? goals[0]
}

/**
 * Metronome tempo when landing on a goal: the last tempo logged; for a goal never tried, half
 * its target (a first go wants room to be clean), never under 30; with no target, 80.
 */
export function startingBpm(goal: Goal, attempts: Attempt[]): number {
  let latest: Attempt | undefined
  for (const attempt of attemptsFor(goal, attempts)) {
    if (attempt.bpm === null) continue
    if (latest === undefined || attempt.at > latest.at) latest = attempt
  }
  if (latest) return latest.bpm as number
  if (goal.targetBpm === null) return DEFAULT_STARTING_BPM
  return Math.max(MIN_BPM, Math.round(goal.targetBpm / 2))
}

/** A new goal's target tempo: the song's tempo when it has one, else 80. */
export function newGoalTargetBpm(song: Song): number {
  return song.tempo ?? DEFAULT_STARTING_BPM
}

export interface GoalStats {
  goalCount: number
  doneCount: number
  /** 0 to 1 */
  progress: number
}

/** Summary of a group of goals: a section's goals, or all of a song's goals. */
export function goalStats(goals: Goal[], attempts: Attempt[]): GoalStats {
  return {
    goalCount: goals.length,
    doneCount: doneCount(goals, attempts),
    progress: averageProgress(goals, attempts),
  }
}

/** When any of the goals was last practiced, or null if never. */
export function lastPracticedAt(goals: Goal[], attempts: Attempt[]): number | null {
  const goalIds = new Set(goals.map((goal) => goal.id))
  let latest: number | null = null
  for (const attempt of attempts) {
    if (!goalIds.has(attempt.goalId)) continue
    if (latest === null || attempt.at > latest) latest = attempt.at
  }
  return latest
}

/** Progress (0 to 1) as the whole percent shown in the UI. */
export function toPercent(progress: number): number {
  return Math.round(progress * 100)
}
