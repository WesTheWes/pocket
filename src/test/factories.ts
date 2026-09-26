import type { Attempt, Goal, Section, Session, Song } from '../domain/schemas'

let counter = 0
const nextId = (prefix: string) => `${prefix}-${++counter}`

export function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: nextId('song'),
    title: 'Piano Man',
    artist: 'Billy Joel',
    chordNotes: '',
    structure: [],
    tempo: null,
    learnedOverride: false,
    createdAt: 0,
    ...overrides,
  }
}

export function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: nextId('section'),
    songId: 'song-1',
    name: 'Verse',
    notes: '',
    order: 0,
    ...overrides,
  }
}

export function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: nextId('goal'),
    songId: 'song-1',
    sectionId: null,
    title: 'Hands together',
    description: '',
    targetBpm: 84,
    createdAt: 0,
    ...overrides,
  }
}

export function makeAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: nextId('attempt'),
    goalId: 'goal-1',
    sessionId: null,
    bpm: 72,
    level: 4,
    at: 0,
    ...overrides,
  }
}

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: nextId('session'),
    songId: 'song-1',
    startedAt: 0,
    pausedMs: 0,
    pausedAt: null,
    endedAt: null,
    ...overrides,
  }
}
