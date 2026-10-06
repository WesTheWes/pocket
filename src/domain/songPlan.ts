import { z } from 'zod'
import { requirementCycles } from './prerequisites'
import {
  bpmSchema,
  goalSchema,
  resourceSchema,
  sectionSchema,
  songSchema,
  type Goal,
  type Section,
  type Song,
} from './schemas'

/*
 * A song plan is what you ask an assistant for and paste back: the song, its sections with notes
 * and goals, the play order, and links. It is plain JSON in words a person could write by hand,
 * so goals refer to each other by title, not id. `parseSongPlan` turns pasted text into a plan
 * (or a reason it cannot), and `planToRecords` turns a plan into the records Pocket stores.
 */

const planGoalSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().default(''),
  targetBpm: bpmSchema.nullable().default(null),
  /** Titles of other goals in this plan to finish first. */
  requires: z.array(z.string().trim().min(1)).default([]),
  resources: z.array(resourceSchema).default([]),
})

const planSectionSchema = z.object({
  name: z.string().trim().min(1),
  notes: z.string().default(''),
  goals: z.array(planGoalSchema).default([]),
})

export const songPlanSchema = z.object({
  title: z.string().trim().min(1),
  artist: z.string().default(''),
  tempo: bpmSchema.nullable().default(null),
  chordNotes: z.string().default(''),
  sections: z.array(planSectionSchema).default([]),
  /** Section names in play order. A section may appear more than once. */
  structure: z.array(z.string().trim().min(1)).default([]),
  /** Goals for the whole song. */
  goals: z.array(planGoalSchema).default([]),
  resources: z.array(resourceSchema).default([]),
})

export type SongPlan = z.infer<typeof songPlanSchema>
export type PlanGoal = z.infer<typeof planGoalSchema>

export type PlanParseResult = { ok: true; plan: SongPlan } | { ok: false; error: string }

const fail = (error: string): PlanParseResult => ({ ok: false, error })

/** The JSON inside a reply: inside ``` fences if there are any, else from the first { to the last }. */
function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  return start !== -1 && end > start ? body.slice(start, end + 1) : body
}

const describePath = (path: ReadonlyArray<PropertyKey>) =>
  path.reduce<string>(
    (text, key) =>
      typeof key === 'number' ? `${text}[${key}]` : text ? `${text}.${String(key)}` : String(key),
    '',
  )

/** Every goal in the plan, whole-song goals first, then each section's in order. */
export function planGoals(plan: SongPlan): Array<{ goal: PlanGoal; section: string | null }> {
  return [
    ...plan.goals.map((goal) => ({ goal, section: null })),
    ...plan.sections.flatMap((section) =>
      section.goals.map((goal) => ({ goal, section: section.name })),
    ),
  ]
}

/**
 * Reads a pasted reply. Never throws: anything unusable comes back with a reason in plain words.
 * Beyond the shape, the pieces must fit: the play order names real sections, goal titles are
 * unique, and "finish first" names real goals without going round in a circle.
 */
export function parseSongPlan(text: string): PlanParseResult {
  if (text.trim() === '') return fail('Paste the reply first.')
  let value: unknown
  try {
    value = JSON.parse(extractJson(text))
  } catch {
    return fail('That isn’t valid JSON. Paste the whole reply, from the first { to the last }.')
  }
  const parsed = songPlanSchema.safeParse(value)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return fail(
      `The plan is incomplete (${describePath(issue.path) || 'top level'}: ${issue.message}).`,
    )
  }
  const plan = parsed.data

  const sectionNames = new Set<string>()
  for (const section of plan.sections) {
    if (sectionNames.has(section.name))
      return fail(`Two sections are both called “${section.name}”.`)
    sectionNames.add(section.name)
  }
  for (const name of plan.structure) {
    if (!sectionNames.has(name)) {
      return fail(`The play order mentions “${name}”, which isn’t one of the sections.`)
    }
  }

  const goals = planGoals(plan)
  const titles = new Set<string>()
  for (const { goal } of goals) {
    if (titles.has(goal.title)) return fail(`Two goals are both called “${goal.title}”.`)
    titles.add(goal.title)
  }
  for (const { goal } of goals) {
    for (const required of goal.requires) {
      if (required === goal.title) return fail(`“${goal.title}” says to finish itself first.`)
      if (!titles.has(required)) {
        return fail(
          `“${goal.title}” says to finish “${required}” first, but there is no such goal.`,
        )
      }
    }
  }
  const circle = requirementCycles(
    goals.map(({ goal }) => ({ id: goal.title, requires: goal.requires })),
  )
  if (circle.length > 0) {
    return fail(
      `These goals require each other in a circle: ${circle.map((t) => `“${t}”`).join(', ')}.`,
    )
  }

  return { ok: true, plan }
}

/** The records a plan becomes. Pure: the caller supplies the clock and ids and does the writing. */
export function planToRecords(
  plan: SongPlan,
  ids: { now: number; newId: () => string },
): { song: Song; sections: Section[]; goals: Goal[] } {
  const songId = ids.newId()
  const sections = plan.sections.map((section, order) =>
    sectionSchema.parse({
      id: ids.newId(),
      songId,
      name: section.name,
      notes: section.notes,
      order,
    }),
  )
  const sectionId = new Map(
    plan.sections.map((section, index) => [section.name, sections[index].id]),
  )

  const all = planGoals(plan)
  const goalId = new Map(all.map(({ goal }) => [goal.title, ids.newId()]))
  // Spaced a millisecond apart so they keep the plan's order wherever goals sort by creation.
  const goals = all.map(({ goal, section }, index) =>
    goalSchema.parse({
      id: goalId.get(goal.title),
      songId,
      sectionId: section === null ? null : sectionId.get(section),
      title: goal.title,
      description: goal.description,
      targetBpm: goal.targetBpm,
      requires: goal.requires.map((title) => goalId.get(title)),
      resources: goal.resources,
      createdAt: ids.now + index,
    }),
  )

  const song = songSchema.parse({
    id: songId,
    title: plan.title,
    artist: plan.artist,
    chordNotes: plan.chordNotes,
    tempo: plan.tempo,
    structure: plan.structure.map((name) => sectionId.get(name)),
    learnedOverride: false,
    resources: plan.resources,
    createdAt: ids.now,
  })
  return { song, sections, goals }
}

export type PlanLevel = 'beginner' | 'intermediate' | 'advanced'

export const PLAN_LEVELS: Array<{ value: PlanLevel; label: string }> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export interface PlanRequest {
  title: string
  artist: string
  /** What the song is for: "comping in a jazz trio", "solo piano at a wedding". */
  context: string
  level: PlanLevel
}

/** The text to paste into an assistant. It asks for exactly what `parseSongPlan` reads. */
export function buildPlanPrompt(request: PlanRequest): string {
  const song = request.artist.trim()
    ? `${request.title.trim()} by ${request.artist.trim()}`
    : request.title.trim()
  const context = request.context.trim() || 'playing it for myself'
  return `I’m learning a song on piano and want a practice plan I can import into Pocket, my practice tracker.

Song: ${song}
What I’m learning it for: ${context}
My level: ${request.level}

Reply with ONE JSON object and nothing else (no commentary, no markdown fences), in exactly this shape. The // notes explain each field; leave them out of your reply.

{
  "title": "Song title",
  "artist": "Artist",
  "tempo": 120,                 // the song’s tempo in BPM (30 to 240), or null
  "chordNotes": "Intro   C  G/B  Am  F\\nVerse   C  G/B  Am  F",   // a chord chart: one line per section, aligned with spaces
  "sections": [
    {
      "name": "Verse",
      "notes": "What to watch for in this section",
      "goals": [
        {
          "title": "Verse, left hand alone",
          "description": "What success sounds like",
          "targetBpm": 90,        // or null for no tempo target
          "requires": [],         // titles of other goals in this plan to finish first
          "resources": []         // links, same shape as below
        }
      ]
    }
  ],
  "structure": ["Intro", "Verse", "Chorus", "Verse", "Chorus"],   // section names in play order; repeats allowed
  "goals": [],                  // goals for the whole song, same shape as a section’s goals
  "resources": [{ "label": "Official video", "url": "https://…", "kind": "video" }]
}

Rules:
- Sections are the song’s real form (Intro, Verse, Chorus, Bridge, Solo, Outro…), and "structure" is the order they are played.
- Each section gets 1 to 3 goals that build on each other, easy to hard: hands apart before hands together, slow before full tempo. Use "requires" so a later goal names the earlier one it builds on.
- Whole-song goals (playing it through, playing with the recording) go in the top-level "goals" and require the section goals they depend on.
- Tailor every goal to what I’m learning it for and my level: voicings, comping, melody, feel, what to leave out.
- Target tempos: a comfortable starting tempo for early goals, the song’s tempo for the final ones.
- Goal titles must be unique within the plan.
- The chord chart is chords only, never lyrics. If you aren’t sure of a chord, say so in that section’s notes instead of guessing.
- Resources: only links you have actually found and opened (search the web): the recording, a lesson, a tutorial, a backing track. Leave "resources" empty rather than inventing a link. "kind" is one of "video", "lesson", "exercise", "other".
- Keep every text short and concrete: I’ll read it at the piano.`
}
