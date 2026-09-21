import type { GoalChange } from '../../domain/session'

/** "fastest Solid 72 to 76 BPM", "no Solid attempt yet to 60 BPM", and so on. */
export function beforeAfterText({ before, after, becameDone }: GoalChange): string {
  if (after === null) return becameDone ? 'Solid attempt logged' : 'no Solid attempt yet'
  if (before === null) return `no Solid attempt yet to ${after} BPM`
  if (before === after) return `fastest Solid ${after} BPM`
  return `fastest Solid ${before} to ${after} BPM`
}

/** The small tag on a "worked on" card: Done, "+4 BPM", a first Solid attempt, or No change. */
export function changeTag({ becameDone, deltaBpm, before, after, improved }: GoalChange): string {
  if (becameDone) return 'Done'
  if (deltaBpm !== null && deltaBpm > 0) return `+${deltaBpm} BPM`
  if (improved && before === null && after !== null) return `First Solid attempt at ${after} BPM`
  return 'No change'
}
