/** What the metronome clicks on: every beat, or every beat split into 2, 3 or 4. */
export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth'

export const CLICKS_PER_BEAT: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 2,
  triplet: 3,
  sixteenth: 4,
}

export const SUBDIVISIONS = Object.keys(CLICKS_PER_BEAT) as Subdivision[]
