import type { QualityLevel } from '../domain/quality'
import type { Attempt, Goal, PocketData, Section, Session, Song } from '../domain/schemas'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** [bpm, level, days ago, logged during the song's practice session?, note] */
type AttemptSeed = [
  bpm: number | null,
  level: QualityLevel,
  daysAgo: number,
  inSession?: boolean,
  note?: string,
]

interface GoalSeed {
  /** Section name, or null for a whole-song goal. */
  section: string | null
  title: string
  description?: string
  targetBpm: number | null
  attempts: AttemptSeed[]
}

interface SongSeed {
  id: string
  title: string
  artist: string
  chordNotes?: string
  sections: string[]
  /** Notes for some sections, by section name. */
  sectionNotes?: Record<string, string>
  /** Section names in play order. */
  structure: string[]
  goals: GoalSeed[]
  createdDaysAgo: number
  session?: { daysAgo: number; minutes: number; pausedMinutes: number }
}

const pianoMan: SongSeed = {
  id: 'piano-man',
  title: 'Piano Man',
  artist: 'Billy Joel',
  chordNotes: [
    'Intro    C G/B Am Am/G F C/E Dm7 G7',
    'Verse    C G/B Am C/G F C/E Dm7 G7',
    'Chorus   F C/E Dm G7 C Am F G',
    'Bridge   Am F C G (build, then stride)',
  ].join('\n'),
  sections: ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'],
  sectionNotes: {
    Verse:
      'Left hand: root, fifth, fifth in 3/4. Let the G/B in bar 2 walk down. Don’t rush the pickup into the chorus.',
    Chorus:
      'Block chords in the right hand with an octave in the bass. Save the big dynamics for the last chorus.',
  },
  structure: ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  createdDaysAgo: 20,
  session: { daysAgo: 2, minutes: 24, pausedMinutes: 3 },
  goals: [
    {
      section: null,
      title: 'Play start to finish without stopping',
      targetBpm: 84,
      attempts: [
        [50, 3, 12],
        [56, 4, 9],
        [70, 2, 4],
      ],
    },
    {
      section: 'Intro',
      title: 'Harmonica line on right hand',
      targetBpm: 76,
      attempts: [
        [70, 4, 14],
        [76, 4, 10],
      ],
    },
    {
      section: 'Verse',
      title: 'Left hand waltz pattern',
      targetBpm: 72,
      attempts: [
        [66, 3, 13],
        [72, 4, 11],
      ],
    },
    {
      section: 'Verse',
      title: 'First 4 bars with only bass and melody',
      targetBpm: 84,
      attempts: [
        [60, 3, 9],
        [64, 4, 6],
        [68, 2, 2, true, 'Left hand drags behind in bar 3.'],
        [76, 3, 2, true, 'Better once I slowed bar 3 right down. Try 80 next time.'],
      ],
    },
    {
      section: 'Chorus',
      title: 'Full chorus with block chords',
      targetBpm: 90,
      attempts: [
        [45, 4, 8],
        [58, 3, 5],
        [68, 2, 3],
      ],
    },
    {
      section: 'Chorus',
      title: 'Walk-up fill into bar 5',
      targetBpm: 84,
      attempts: [
        [60, 2, 7],
        [50, 2, 2, true],
        [42, 4, 2, true, 'Clean at 42. Push toward 50 next.'],
      ],
    },
    {
      section: 'Bridge',
      title: 'Play the entire section in a stride piano style',
      targetBpm: 100,
      attempts: [[60, 1, 3]],
    },
    {
      section: 'Outro',
      title: 'Land the ending fill',
      targetBpm: 72,
      attempts: [
        [66, 4, 12],
        [72, 5, 8],
      ],
    },
  ],
}

// The songs below are illustrative sample data for filling out the Home screen.
const others: SongSeed[] = [
  {
    id: 'dont-stop-believin',
    title: "Don't Stop Believin'",
    artist: 'Journey',
    sections: ['Intro', 'Verse', 'Chorus'],
    structure: ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus'],
    createdDaysAgo: 60,
    goals: [
      {
        section: null,
        title: 'Play along with the record',
        targetBpm: 120,
        attempts: [[120, 4, 3]],
      },
      {
        section: 'Intro',
        title: 'Piano riff with both hands',
        targetBpm: 118,
        attempts: [[118, 5, 6]],
      },
      {
        section: 'Chorus',
        title: 'Block chords with octave bass',
        targetBpm: 120,
        attempts: [[122, 4, 5]],
      },
    ],
  },
  {
    id: 'sir-duke',
    title: 'Sir Duke',
    artist: 'Stevie Wonder',
    sections: ['Intro', 'Verse', 'Bridge'],
    structure: ['Intro', 'Verse', 'Bridge', 'Verse'],
    createdDaysAgo: 30,
    goals: [
      {
        section: null,
        title: 'Play through with the horn line',
        targetBpm: 120,
        attempts: [[60, 4, 6]],
      },
      { section: 'Verse', title: 'Left hand bass line', targetBpm: 100, attempts: [[40, 4, 8]] },
      {
        section: 'Bridge',
        title: 'Right hand chord stabs',
        targetBpm: 110,
        attempts: [
          [44, 4, 9],
          [70, 2, 5],
        ],
      },
    ],
  },
  {
    id: 'autumn-leaves',
    title: 'Autumn Leaves',
    artist: 'Joseph Kosma',
    chordNotes: 'A  Cm7 F7 Bbmaj7 Ebmaj7 | Am7b5 D7 Gm6 Gm6',
    sections: ['Head A', 'Head B'],
    structure: ['Head A', 'Head A', 'Head B', 'Head B'],
    createdDaysAgo: 14,
    goals: [
      {
        section: 'Head A',
        title: 'Shell voicings, left hand',
        targetBpm: 100,
        attempts: [[30, 4, 4]],
      },
      { section: 'Head B', title: 'Rootless voicings', targetBpm: 100, attempts: [[50, 2, 4]] },
    ],
  },
  {
    id: 'rocket-man',
    title: 'Rocket Man',
    artist: 'Elton John',
    sections: [],
    structure: [],
    createdDaysAgo: 1,
    goals: [],
  },
]

/** Builds the sample data relative to `now`, so "last practiced" dates look recent. */
export function createSeedData(now: number): PocketData {
  const data: PocketData = { songs: [], sections: [], goals: [], attempts: [], sessions: [] }

  for (const seed of [pianoMan, ...others]) {
    const sectionIds = new Map<string, string>()
    seed.sections.forEach((name, order) => {
      const section: Section = {
        id: `${seed.id}-s${order}`,
        songId: seed.id,
        name,
        notes: seed.sectionNotes?.[name] ?? '',
        order,
      }
      sectionIds.set(name, section.id)
      data.sections.push(section)
    })

    const song: Song = {
      id: seed.id,
      title: seed.title,
      artist: seed.artist,
      chordNotes: seed.chordNotes ?? '',
      structure: seed.structure.map((name) => sectionIds.get(name)!),
      tempo: null,
      learnedOverride: false,
      createdAt: now - seed.createdDaysAgo * DAY,
    }
    data.songs.push(song)

    let session: Session | undefined
    if (seed.session) {
      const { daysAgo, minutes, pausedMinutes } = seed.session
      const startedAt = now - daysAgo * DAY
      session = {
        id: `${seed.id}-session`,
        songId: seed.id,
        startedAt,
        pausedMs: pausedMinutes * MINUTE,
        pausedAt: null,
        endedAt: startedAt + (minutes + pausedMinutes) * MINUTE,
      }
      data.sessions.push(session)
    }

    let sessionAttempts = 0
    seed.goals.forEach((goalSeed, goalIndex) => {
      const goal: Goal = {
        id: `${seed.id}-g${goalIndex}`,
        songId: seed.id,
        sectionId: goalSeed.section === null ? null : sectionIds.get(goalSeed.section)!,
        title: goalSeed.title,
        description: goalSeed.description ?? '',
        targetBpm: goalSeed.targetBpm,
        createdAt: song.createdAt + goalIndex * MINUTE,
      }
      data.goals.push(goal)

      goalSeed.attempts.forEach(([bpm, level, daysAgo, inSession, note], attemptIndex) => {
        // Attempts in the practice session are spaced 5 minutes apart from its start.
        const at =
          inSession && session
            ? session.startedAt + ++sessionAttempts * 5 * MINUTE
            : now - daysAgo * DAY
        const attempt: Attempt = {
          id: `${goal.id}-a${attemptIndex}`,
          goalId: goal.id,
          sessionId: inSession && session ? session.id : null,
          bpm,
          level,
          note: note ?? '',
          at,
        }
        data.attempts.push(attempt)
      })
    })
  }

  return data
}
