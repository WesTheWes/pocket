import { z } from 'zod'

export const MIN_BPM = 30
export const MAX_BPM = 240

const id = z.string().min(1)
const timestamp = z.number().int().nonnegative()

export const bpmSchema = z.number().int().min(MIN_BPM).max(MAX_BPM)

export const qualitySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
])

export const songSchema = z.object({
  id,
  title: z.string().trim().min(1),
  artist: z.string(),
  chordNotes: z.string(),
  /** Ordered section IDs. A section may appear more than once. */
  structure: z.array(id),
  /** True when the user has manually marked the song as learned. */
  learnedOverride: z.boolean(),
  createdAt: timestamp,
})

export const sectionSchema = z.object({
  id,
  songId: id,
  name: z.string().trim().min(1),
  notes: z.string(),
  /** Position among the song's sections; independent of `Song.structure`. */
  order: z.number().int().nonnegative(),
})

export const goalSchema = z.object({
  id,
  songId: id,
  /** Null means the goal covers the whole song. */
  sectionId: id.nullable(),
  title: z.string().trim().min(1),
  description: z.string(),
  /** Null means the goal has no tempo target; any Solid attempt completes it. */
  targetBpm: bpmSchema.nullable(),
  createdAt: timestamp,
})

export const attemptSchema = z.object({
  id,
  goalId: id,
  sessionId: id.nullable(),
  bpm: bpmSchema.nullable(),
  level: qualitySchema,
  at: timestamp,
})

export const sessionSchema = z.object({
  id,
  songId: id,
  startedAt: timestamp,
  /** Total time spent paused, not counting a pause that is still open. */
  pausedMs: timestamp,
  /** When the current pause began, or null if the timer is running. */
  pausedAt: timestamp.nullable(),
  endedAt: timestamp.nullable(),
})

/** Everything in the database. Used for sample data now and JSON backup/restore later. */
export const pocketDataSchema = z.object({
  songs: z.array(songSchema),
  sections: z.array(sectionSchema),
  goals: z.array(goalSchema),
  attempts: z.array(attemptSchema),
  sessions: z.array(sessionSchema),
})

export type Song = z.infer<typeof songSchema>
export type Section = z.infer<typeof sectionSchema>
export type Goal = z.infer<typeof goalSchema>
export type Attempt = z.infer<typeof attemptSchema>
export type Session = z.infer<typeof sessionSchema>
export type PocketData = z.infer<typeof pocketDataSchema>

/** What the New song and Edit song forms collect. */
export const songFormSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title'),
  artist: z.string().trim(),
  chordNotes: z.string(),
  learnedOverride: z.boolean(),
})

export type SongFormValues = z.infer<typeof songFormSchema>
