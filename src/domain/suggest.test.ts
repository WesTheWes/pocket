import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal, makeSection, makeSession, makeSong } from '../test/factories'
import { goalReason, nextStep, openGoals, suggestGoal, unlockedBy } from './suggest'

const goal = makeGoal({ id: 'g', songId: 's', targetBpm: 84 })
const attempt = (bpm: number | null, level: 1 | 2 | 3 | 4 | 5, at: number, goalId = 'g') =>
  makeAttempt({ goalId, bpm, level, at })

describe('nextStep', () => {
  it('starts gently with nothing logged', () => {
    expect(nextStep(goal, [])).toEqual({ bpm: 42, text: 'First go. Start at 42; slower is fine.' })
    expect(nextStep({ ...goal, targetBpm: null }, []).bpm).toBe(80)
  })

  it('steps up after two Solid attempts at the same tempo, never past the target', () => {
    expect(nextStep(goal, [attempt(76, 4, 1), attempt(76, 4, 2)])).toEqual({
      bpm: 80,
      text: 'Two Solid at 76. Try 80.',
    })
    expect(nextStep(goal, [attempt(82, 4, 1), attempt(82, 4, 2)])).toEqual({
      bpm: 84,
      text: 'Two Solid at 82. 84 finishes it.',
    })
    expect(nextStep({ ...goal, targetBpm: null }, [attempt(76, 5, 1), attempt(76, 4, 2)]).bpm).toBe(
      80,
    )
  })

  it('asks for a second Solid before moving on', () => {
    expect(nextStep(goal, [attempt(72, 4, 1), attempt(76, 4, 2)])).toEqual({
      bpm: 76,
      text: 'Solid at 76 once. Once more to lock it in.',
    })
  })

  it('drops back a step after a miss, and stays put at the floor', () => {
    expect(nextStep(goal, [attempt(76, 4, 1), attempt(80, 2, 2)])).toEqual({
      bpm: 76,
      text: 'Not Solid at 80. Drop to 76 and build back up.',
    })
    expect(nextStep(goal, [attempt(30, 1, 1)]).text).toBe(
      'Not Solid at 30. Stay there until it is clean.',
    )
  })

  it('holds at the target once it is reached', () => {
    expect(nextStep(goal, [attempt(84, 4, 1)]).text).toBe(
      'Solid at 84: that is the target. Keep it there.',
    )
  })

  it('ignores attempts without a tempo when reading the run', () => {
    expect(nextStep(goal, [attempt(76, 4, 1), attempt(null, 2, 2), attempt(76, 4, 3)]).bpm).toBe(80)
  })
})

describe('goalReason', () => {
  it('says where the goal stands', () => {
    expect(goalReason(goal, [])).toBe('Never tried')
    expect(goalReason(goal, [attempt(70, 2, 1)])).toBe('No Solid yet · best so far 70 BPM')
    expect(goalReason(goal, [attempt(null, 2, 1)])).toBe('No Solid yet')
    expect(goalReason(goal, [attempt(76, 4, 1)])).toBe('fastest Solid 76 of 84 BPM · 8 to go')
  })
})

describe('unlockedBy and openGoals', () => {
  const a = makeGoal({ id: 'a', songId: 's', targetBpm: 100 })
  const b = makeGoal({ id: 'b', songId: 's', targetBpm: 100 })
  const needsA = makeGoal({ id: 'na', songId: 's', targetBpm: 100, requires: ['a'] })
  const needsBoth = makeGoal({ id: 'nab', songId: 's', targetBpm: 100, requires: ['a', 'b'] })
  const goals = [a, b, needsA, needsBoth]
  const solid = (id: string) => attempt(100, 4, 1, id)

  it('lists what finishing a goal would open', () => {
    expect(unlockedBy(a, goals, []).map((g) => g.id)).toEqual(['na'])
    expect(unlockedBy(a, goals, [solid('b')]).map((g) => g.id)).toEqual(['na', 'nab'])
    expect(unlockedBy(a, goals, [solid('na')]).map((g) => g.id)).toEqual([])
  })

  it('finds open goals that were never tried', () => {
    expect(openGoals(goals, [solid('a')]).map((g) => g.id)).toEqual(['na'])
    expect(openGoals(goals, [solid('a'), attempt(60, 2, 2, 'na')]).map((g) => g.id)).toEqual([])
    expect(openGoals(goals, []).map((g) => g.id)).toEqual([])
  })
})

describe('suggestGoal', () => {
  const songA = makeSong({ id: 'a', title: 'A', createdAt: 1 })
  const songB = makeSong({ id: 'b', title: 'B', createdAt: 2 })
  const verse = makeSection({ id: 'v', songId: 'a', name: 'Verse' })
  const a1 = makeGoal({ id: 'a1', songId: 'a', sectionId: 'v', title: 'A1', targetBpm: 84 })
  const a2 = makeGoal({ id: 'a2', songId: 'a', title: 'A2', targetBpm: 84, requires: ['a1'] })
  const b1 = makeGoal({ id: 'b1', songId: 'b', title: 'B1', targetBpm: 84 })
  const goals = [a1, a2, b1]

  it('is null without songs or goals', () => {
    expect(suggestGoal([], [], [], [], [])).toBeNull()
    expect(suggestGoal([songA], [], [], [], [])).toBeNull()
  })

  it('picks the song practised most recently, with the reason, step and what it opens', () => {
    const sessions = [
      makeSession({ songId: 'b', startedAt: 100 }),
      makeSession({ songId: 'a', startedAt: 200 }),
    ]
    const attempts = [attempt(76, 4, 150, 'a1'), attempt(76, 4, 160, 'a1')]
    const suggestion = suggestGoal([songA, songB], [verse], goals, attempts, sessions)
    expect(suggestion).toMatchObject({
      song: songA,
      goal: a1,
      section: verse,
      reason: 'fastest Solid 76 of 84 BPM · 8 to go',
      step: { bpm: 80 },
    })
    expect(suggestion?.unlocks.map((g) => g.id)).toEqual(['a2'])
  })

  it('prefers a section goal to a whole-song one, and skips locked goals', () => {
    const whole = makeGoal({ id: 'w', songId: 'a', title: 'Whole', targetBpm: 84, createdAt: 0 })
    expect(suggestGoal([songA], [verse], [whole, a1, a2], [], [])?.goal.id).toBe('a1')
    expect(suggestGoal([songA], [verse], [whole, a2], [], [])?.goal.id).toBe('w')
    const locked = makeGoal({
      id: 'l',
      songId: 'a',
      sectionId: 'v',
      requires: ['w'],
      targetBpm: 84,
    })
    expect(suggestGoal([songA], [verse], [whole, locked], [], [])?.goal.id).toBe('w')
  })

  it('falls back to attempts for recency, and to the newest song', () => {
    expect(
      suggestGoal([songA, songB], [verse], goals, [attempt(60, 2, 5, 'b1')], [])?.song.id,
    ).toBe('b')
    expect(suggestGoal([songA, songB], [verse], goals, [], [])?.song.id).toBe('b')
  })

  it('skips learned songs and songs whose every goal is done', () => {
    const done = [attempt(84, 4, 1, 'b1')]
    expect(
      suggestGoal([songB, songA], [verse], goals, done, [
        makeSession({ songId: 'b', startedAt: 9 }),
      ])?.song.id,
    ).toBe('a')
    expect(suggestGoal([{ ...songA, learnedOverride: true }], [verse], [a1], [], [])).toBeNull()
  })
})
