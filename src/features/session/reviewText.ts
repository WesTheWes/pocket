import { QUALITY_LABELS } from '../../domain/quality'
import type { Attempt } from '../../domain/schemas'
import type { GoalChange } from '../../domain/session'

const bpmText = (bpm: number | null) => (bpm === null ? 'No tempo' : `${bpm} BPM`)

/** The last attempt of the session: what the card compares against the last one before it. */
export const lastAttempt = (change: GoalChange): Attempt =>
  change.attempts[change.attempts.length - 1]

/** "54 → 60 BPM", or just "60 BPM" when the goal had no attempt before this session. */
export function tempoText(change: GoalChange): string {
  const now = lastAttempt(change).bpm
  const before = change.lastBefore?.bpm
  if (before === undefined) return bpmText(now)
  if (before !== null && now !== null) return `${before} → ${now} BPM`
  return `${bpmText(before)} → ${bpmText(now)}`
}

/** "Many mistakes → Few mistakes", or a single level when it did not change or there was nothing before. */
export function qualityText(change: GoalChange): string {
  const now = lastAttempt(change).level
  const before = change.lastBefore?.level
  if (before === undefined || before === now) return QUALITY_LABELS[now]
  return `${QUALITY_LABELS[before]} → ${QUALITY_LABELS[now]}`
}

export interface ChangeTag {
  text: string
  /** True when the tag reports progress, so it can be highlighted. */
  good: boolean
}

/**
 * The small tag on a "worked on" card: Done, what went up ("+6 BPM · quality up"), a new
 * fastest Solid tempo, what went down, or No change. Compares the last attempt before the
 * session with the last one in it.
 */
export function changeTag(change: GoalChange): ChangeTag {
  if (change.becameDone) return { text: 'Done', good: true }

  const now = lastAttempt(change)
  const before = change.lastBefore
  if (before === null) {
    if (change.after !== null)
      return { text: `First Solid attempt at ${change.after} BPM`, good: true }
    return { text: 'First attempt', good: false }
  }

  const tempo = before.bpm !== null && now.bpm !== null ? now.bpm - before.bpm : 0
  const quality = now.level - before.level
  const ups = [tempo > 0 && `+${tempo} BPM`, quality > 0 && 'quality up'].filter(Boolean)
  if (ups.length > 0) return { text: ups.join(' · '), good: true }
  if (change.improved && change.after !== null) {
    return { text: `Fastest Solid now ${change.after} BPM`, good: true }
  }
  const downs = [tempo < 0 && `−${-tempo} BPM`, quality < 0 && 'quality down'].filter(Boolean)
  if (downs.length > 0) return { text: downs.join(' · '), good: false }
  return { text: 'No change', good: false }
}
