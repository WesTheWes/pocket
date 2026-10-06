import { latestNote } from './notes'
import {
  fastestSolidBpm,
  goalDone,
  goalLocked,
  goalProgress,
  lastPracticedAt,
  orderGoals,
  songStatus,
  startingBpm,
} from './progress'
import { isSolid } from './quality'
import {
  MAX_BPM,
  MIN_BPM,
  type Attempt,
  type Goal,
  type Section,
  type Session,
  type Song,
} from './schemas'

/*
 * "Where should I start?" answered from what is already stored: the song you practised most
 * recently, its first goal that is neither done nor locked, and a next step worked out from the
 * last attempts. Nothing here is saved; it is recomputed from attempts and sessions.
 */

const STEP = 4

export interface NextStep {
  /** The tempo to set the metronome to. */
  bpm: number
  /** Why, in one line: "Two Solid at 76. Try 80." */
  text: string
}

const attemptsFor = (goal: Goal, attempts: Attempt[]) =>
  attempts.filter((attempt) => attempt.goalId === goal.id).sort((a, b) => a.at - b.at)

const clampBpm = (bpm: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, bpm))

/**
 * What to try next on a goal: two Solid attempts at a tempo earn a step up (never past the
 * target), one Solid asks for a second, a miss drops back a step.
 */
export function nextStep(goal: Goal, attempts: Attempt[]): NextStep {
  const played = attemptsFor(goal, attempts).filter(
    (a): a is Attempt & { bpm: number } => a.bpm !== null,
  )
  const target = goal.targetBpm
  if (played.length === 0) {
    const bpm = startingBpm(goal, attempts)
    return { bpm, text: `First go. Start at ${bpm}; slower is fine.` }
  }
  const last = played[played.length - 1]
  const previous = played[played.length - 2]
  if (isSolid(last.level)) {
    if (target !== null && last.bpm >= target) {
      return { bpm: last.bpm, text: `Solid at ${last.bpm}: that is the target. Keep it there.` }
    }
    if (previous && isSolid(previous.level) && previous.bpm === last.bpm) {
      const bpm = clampBpm(target === null ? last.bpm + STEP : Math.min(last.bpm + STEP, target))
      const finishes = target !== null && bpm >= target
      return {
        bpm,
        text: `Two Solid at ${last.bpm}. ${finishes ? `${bpm} finishes it.` : `Try ${bpm}.`}`,
      }
    }
    return { bpm: last.bpm, text: `Solid at ${last.bpm} once. Once more to lock it in.` }
  }
  const bpm = clampBpm(last.bpm - STEP)
  if (bpm === last.bpm)
    return { bpm, text: `Not Solid at ${last.bpm}. Stay there until it is clean.` }
  return { bpm, text: `Not Solid at ${last.bpm}. Drop to ${bpm} and build back up.` }
}

/** Where the goal stands, in one line: "fastest Solid 76 of 84 BPM · 8 to go". */
export function goalReason(goal: Goal, attempts: Attempt[]): string {
  const own = attemptsFor(goal, attempts)
  if (own.length === 0) return 'Never tried'
  const fastest = fastestSolidBpm(goal, attempts)
  if (fastest === null) {
    const best = own.reduce<number | null>(
      (max, a) => (a.bpm !== null && (max === null || a.bpm > max) ? a.bpm : max),
      null,
    )
    return best === null ? 'No Solid yet' : `No Solid yet · best so far ${best} BPM`
  }
  if (goal.targetBpm === null) return 'Solid already'
  return `fastest Solid ${fastest} of ${goal.targetBpm} BPM · ${goal.targetBpm - fastest} to go`
}

/** The goals that finishing `goal` would open: not done, require it, and need nothing else. */
export function unlockedBy(goal: Goal, goals: Goal[], attempts: Attempt[]): Goal[] {
  return goals.filter(
    (other) =>
      other.id !== goal.id &&
      other.requires.includes(goal.id) &&
      !goalDone(other, attempts) &&
      other.requires.every(
        (id) => id === goal.id || goalDone(goals.find((g) => g.id === id) ?? goal, attempts),
      ),
  )
}

/** Goals that are open (everything they required is done) but have never been tried. */
export function openGoals(goals: Goal[], attempts: Attempt[]): Goal[] {
  const byId = new Map(goals.map((goal) => [goal.id, goal]))
  const tried = new Set(attempts.map((attempt) => attempt.goalId))
  return goals.filter(
    (goal) =>
      goal.requires.length > 0 &&
      !tried.has(goal.id) &&
      !goalDone(goal, attempts) &&
      goal.requires.every((id) => {
        const required = byId.get(id)
        return required === undefined || goalDone(required, attempts)
      }),
  )
}

export interface Suggestion {
  song: Song
  goal: Goal
  section: Section | null
  /** 0 to 1 */
  progress: number
  reason: string
  step: NextStep
  unlocks: Goal[]
  lastNote: Attempt | null
}

/**
 * One goal to start on: from the song practised most recently (by session, else by attempt;
 * never a learned song), its first goal that is not done and not locked. A section's goal
 * comes before a whole-song one: the song is put together last.
 */
export function suggestGoal(
  songs: Song[],
  sections: Section[],
  goals: Goal[],
  attempts: Attempt[],
  sessions: Session[],
): Suggestion | null {
  const lastSession = new Map<string, number>()
  for (const session of sessions) {
    lastSession.set(
      session.songId,
      Math.max(lastSession.get(session.songId) ?? -1, session.startedAt),
    )
  }
  const recency = (song: Song) =>
    Math.max(
      lastSession.get(song.id) ?? -1,
      lastPracticedAt(
        goals.filter((goal) => goal.songId === song.id),
        attempts,
      ) ?? -1,
    )
  const ranked = [...songs].sort((a, b) => recency(b) - recency(a) || b.createdAt - a.createdAt)

  for (const song of ranked) {
    const songGoals = goals.filter((goal) => goal.songId === song.id)
    if (songGoals.length === 0 || songStatus(song, songGoals, attempts) === 'learned') continue
    const songSections = sections.filter((section) => section.songId === song.id)
    const open = orderGoals(songGoals, songSections).filter(
      (candidate) => !goalDone(candidate, attempts) && !goalLocked(candidate, songGoals, attempts),
    )
    const goal = open.find((candidate) => candidate.sectionId !== null) ?? open[0]
    if (!goal) continue
    return {
      song,
      goal,
      section: songSections.find((section) => section.id === goal.sectionId) ?? null,
      progress: goalProgress(goal, attempts),
      reason: goalReason(goal, attempts),
      step: nextStep(goal, attempts),
      unlocks: unlockedBy(goal, songGoals, attempts),
      lastNote: latestNote(goal.id, attempts),
    }
  }
  return null
}
