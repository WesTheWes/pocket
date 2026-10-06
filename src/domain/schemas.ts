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

export const resourceKindSchema = z.union([
  z.literal('video'),
  z.literal('lesson'),
  z.literal('exercise'),
  z.literal('other'),
])

/** A link worth having at hand: the recording, a lesson, an exercise. */
export const resourceSchema = z.object({
  label: z.string().trim().min(1, 'Give the link a label'),
  url: z.url({ protocol: /^https?$/, error: 'Enter a full web address (https://…)' }),
  kind: resourceKindSchema,
})

export const songSchema = z.object({
  id,
  title: z.string().trim().min(1),
  artist: z.string(),
  chordNotes: z.string(),
  /** The song's tempo in BPM, or null when not set. New goals start their target tempo here. */
  tempo: bpmSchema.nullable(),
  /** Ordered section IDs. A section may appear more than once. */
  structure: z.array(id),
  /** True when the user has manually marked the song as learned. */
  learnedOverride: z.boolean(),
  resources: z.array(resourceSchema),
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
  /** Goals (of the same song) to finish before this one. A suggested order, never a hard block. */
  requires: z.array(id),
  resources: z.array(resourceSchema),
  createdAt: timestamp,
})

export const attemptSchema = z.object({
  id,
  goalId: id,
  sessionId: id.nullable(),
  bpm: bpmSchema.nullable(),
  level: qualitySchema,
  /** What went wrong or what to try next. Empty when nothing was written. */
  note: z.string(),
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

export type ResourceKind = z.infer<typeof resourceKindSchema>
export type Resource = z.infer<typeof resourceSchema>
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
  tempo: bpmSchema.nullable(),
  learnedOverride: z.boolean(),
  resources: z.array(resourceSchema),
})

export type SongFormValues = z.infer<typeof songFormSchema>

/** What the New section and Edit section forms collect. */
export const sectionFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name'),
  notes: z.string(),
})

export type SectionFormValues = z.infer<typeof sectionFormSchema>

/** What the New goal and Edit goal forms collect. */
export const goalFormSchema = z.object({
  sectionId: id.nullable(),
  title: z.string().trim().min(1, 'Enter a title'),
  description: z.string(),
  targetBpm: bpmSchema.nullable(),
  requires: z.array(id),
  resources: z.array(resourceSchema),
})

export type GoalFormValues = z.infer<typeof goalFormSchema>
