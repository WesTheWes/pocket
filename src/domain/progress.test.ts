import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal, makeSection, makeSong } from '../test/factories'
import {
  newGoalTargetBpm,
  averageProgress,
  blockingGoals,
  doneCount,
  fastestSolidBpm,
  firstUnfinishedGoal,
  goalDone,
  goalProgress,
  goalLocked,
  goalStats,
  lastPracticedAt,
  lockReason,
  orderGoals,
  songStatus,
  startingBpm,
  toPercent,
} from './progress'

const goal = makeGoal({ id: 'g', targetBpm: 84 })
const attempt = (bpm: number | null, level: 1 | 2 | 3 | 4 | 5, extra = {}) =>
  makeAttempt({ goalId: 'g', bpm, level, ...extra })

describe('fastestSolidBpm', () => {
  it('is the highest tempo among Solid or better attempts', () => {
    expect(fastestSolidBpm(goal, [attempt(60, 4), attempt(72, 5), attempt(66, 4)])).toBe(72)
  })

  it('ignores attempts below Solid, however fast', () => {
    expect(fastestSolidBpm(goal, [attempt(60, 4), attempt(120, 3), attempt(140, 1)])).toBe(60)
  })

  it('ignores attempts without a tempo and attempts for other goals', () => {
    const other = makeAttempt({ goalId: 'other', bpm: 200, level: 5 })
    expect(fastestSolidBpm(goal, [attempt(null, 5), other])).toBeNull()
  })

  it('is null when there are no attempts', () => {
    expect(fastestSolidBpm(goal, [])).toBeNull()
  })
})

describe('goalDone', () => {
  it('is false until a Solid attempt reaches the target tempo', () => {
    expect(goalDone(goal, [attempt(72, 4)])).toBe(false)
    expect(goalDone(goal, [attempt(84, 4)])).toBe(true)
    expect(goalDone(goal, [attempt(90, 5)])).toBe(true)
  })

  it('does not count fast attempts below Solid', () => {
    expect(goalDone(goal, [attempt(100, 3)])).toBe(false)
  })

  it("never counts Can't play at all", () => {
    expect(goalDone(goal, [attempt(100, 1)])).toBe(false)
  })

  it('does not count a Solid attempt with no tempo when the goal has a target tempo', () => {
    expect(goalDone(goal, [attempt(null, 5)])).toBe(false)
  })

  it('with no target tempo, is done by any Solid or better attempt', () => {
    const untimed = makeGoal({ id: 'g', targetBpm: null })
    expect(goalDone(untimed, [])).toBe(false)
    expect(goalDone(untimed, [attempt(60, 3)])).toBe(false)
    expect(goalDone(untimed, [attempt(null, 4)])).toBe(true)
    expect(goalDone(untimed, [attempt(50, 4)])).toBe(true)
  })

  it('follows a target tempo that is lowered later', () => {
    const attempts = [attempt(72, 4)]
    expect(goalDone(goal, attempts)).toBe(false)
    expect(goalDone({ ...goal, targetBpm: 70 }, attempts)).toBe(true)
  })
})

describe('goalProgress', () => {
  it('is the fastest Solid tempo over the target tempo', () => {
    expect(goalProgress(goal, [attempt(42, 4)])).toBeCloseTo(0.5)
  })

  it('is capped at 1', () => {
    expect(goalProgress(goal, [attempt(120, 5)])).toBe(1)
  })

  it('is 0 with no Solid attempt', () => {
    expect(goalProgress(goal, [attempt(60, 3)])).toBe(0)
  })

  it('with no target tempo, is 1 once done and 0 before', () => {
    const untimed = makeGoal({ id: 'g', targetBpm: null })
    expect(goalProgress(untimed, [])).toBe(0)
    expect(goalProgress(untimed, [attempt(null, 4)])).toBe(1)
  })
})

describe('averageProgress and doneCount', () => {
  const a = makeGoal({ id: 'a', targetBpm: 100 })
  const b = makeGoal({ id: 'b', targetBpm: 100 })
  const attempts = [
    makeAttempt({ goalId: 'a', bpm: 100, level: 4 }),
    makeAttempt({ goalId: 'b', bpm: 50, level: 4 }),
  ]

  it('averages the goals', () => {
    expect(averageProgress([a, b], attempts)).toBeCloseTo(0.75)
  })

  it('is 0 for no goals', () => {
    expect(averageProgress([], attempts)).toBe(0)
  })

  it('counts done goals', () => {
    expect(doneCount([a, b], attempts)).toBe(1)
  })
})

describe('songStatus', () => {
  const song = makeSong()
  const a = makeGoal({ id: 'a', targetBpm: 100 })
  const b = makeGoal({ id: 'b', targetBpm: 100 })
  const solid = (goalId: string) => makeAttempt({ goalId, bpm: 100, level: 4 })

  it('is learned when every goal is done', () => {
    expect(songStatus(song, [a, b], [solid('a'), solid('b')])).toBe('learned')
  })

  it('is in progress when any goal is not done', () => {
    expect(songStatus(song, [a, b], [solid('a')])).toBe('in-progress')
  })

  it('is in progress with no goals, not vacuously learned', () => {
    expect(songStatus(song, [], [])).toBe('in-progress')
  })

  it('is learned when manually overridden', () => {
    expect(songStatus({ ...song, learnedOverride: true }, [a, b], [])).toBe('learned')
  })
})

describe('orderGoals', () => {
  const verse = makeSection({ id: 'verse', order: 0 })
  const chorus = makeSection({ id: 'chorus', order: 1 })
  const whole = makeGoal({ id: 'whole', sectionId: null, createdAt: 5 })
  const chorusGoal = makeGoal({ id: 'c1', sectionId: 'chorus', createdAt: 1 })
  const verseLate = makeGoal({ id: 'v2', sectionId: 'verse', createdAt: 3 })
  const verseEarly = makeGoal({ id: 'v1', sectionId: 'verse', createdAt: 2 })

  it('puts whole-song goals first, then sections in order, then creation order', () => {
    const ordered = orderGoals([chorusGoal, verseLate, whole, verseEarly], [chorus, verse])
    expect(ordered.map((g) => g.id)).toEqual(['whole', 'v1', 'v2', 'c1'])
  })

  it('moves a goal after the goals it requires, as little as possible', () => {
    const wholeAfterChorus = { ...whole, requires: ['c1'] }
    const earlyAfterLate = { ...verseEarly, requires: ['v2'] }
    const ordered = orderGoals(
      [chorusGoal, verseLate, wholeAfterChorus, earlyAfterLate],
      [chorus, verse],
    )
    expect(ordered.map((g) => g.id)).toEqual(['v2', 'v1', 'c1', 'whole'])
  })

  it('ignores a requirement that is not in the list, and survives a circle', () => {
    const ghost = { ...whole, requires: ['ghost'] }
    expect(orderGoals([ghost, verseEarly], [verse]).map((g) => g.id)).toEqual(['whole', 'v1'])
    const x = makeGoal({ id: 'x', requires: ['y'], createdAt: 1 })
    const y = makeGoal({ id: 'y', requires: ['x'], createdAt: 2 })
    expect(orderGoals([y, x], []).map((g) => g.id)).toEqual(['x', 'y'])
  })
})

describe('locked goals', () => {
  const a = makeGoal({ id: 'a', title: 'A', targetBpm: 100 })
  const b = makeGoal({ id: 'b', title: 'B', targetBpm: 100, requires: ['a'] })
  const c = makeGoal({ id: 'c', title: 'C', targetBpm: 100, requires: ['a', 'b', 'ghost'] })
  const solid = (goalId: string) => makeAttempt({ goalId, bpm: 100, level: 4 })

  it('lists the required goals that are not done, skipping unknown ids', () => {
    expect(blockingGoals(c, [a, b, c], []).map((g) => g.id)).toEqual(['a', 'b'])
    expect(blockingGoals(c, [a, b, c], [solid('a')]).map((g) => g.id)).toEqual(['b'])
  })

  it('is locked until what it requires is done, unless it is done itself', () => {
    expect(goalLocked(b, [a, b], [])).toBe(true)
    expect(goalLocked(b, [a, b], [solid('a')])).toBe(false)
    expect(goalLocked(b, [a, b], [solid('b')])).toBe(false)
    expect(goalLocked(a, [a, b], [])).toBe(false)
  })

  it('explains the lock in words, or says nothing', () => {
    expect(lockReason(c, [a, b, c], [])).toBe('Finish A and B first')
    expect(lockReason(b, [a, b], [solid('a')])).toBeUndefined()
  })
})

describe('firstUnfinishedGoal', () => {
  const a = makeGoal({ id: 'a', targetBpm: 100 })
  const b = makeGoal({ id: 'b', targetBpm: 100 })
  const solid = (goalId: string) => makeAttempt({ goalId, bpm: 100, level: 4 })

  it('returns the first goal that is not done', () => {
    expect(firstUnfinishedGoal([a, b], [solid('a')])?.id).toBe('b')
  })

  it('skips a locked goal, unless every open goal is locked', () => {
    const locked = { ...a, requires: ['b'] }
    expect(firstUnfinishedGoal([locked, b], [])?.id).toBe('b')
    expect(firstUnfinishedGoal([locked], [])?.id).toBe('a')
  })

  it('returns the first goal when every goal is done', () => {
    expect(firstUnfinishedGoal([a, b], [solid('a'), solid('b')])?.id).toBe('a')
  })

  it('returns undefined with no goals', () => {
    expect(firstUnfinishedGoal([], [])).toBeUndefined()
  })
})

describe('newGoalTargetBpm', () => {
  it("starts a new goal at the song's tempo", () => {
    expect(newGoalTargetBpm(makeSong({ tempo: 132 }))).toBe(132)
  })

  it('falls back to 80 for a song with no tempo', () => {
    expect(newGoalTargetBpm(makeSong({ tempo: null }))).toBe(80)
  })
})

describe('startingBpm', () => {
  it('is the most recently logged tempo', () => {
    const attempts = [
      attempt(60, 3, { at: 1 }),
      attempt(70, 2, { at: 3 }),
      attempt(65, 4, { at: 2 }),
    ]
    expect(startingBpm(goal, attempts)).toBe(70)
  })

  it('skips attempts with no tempo and attempts for other goals', () => {
    const other = makeAttempt({ goalId: 'other', bpm: 150, at: 9 })
    expect(startingBpm(goal, [attempt(60, 3, { at: 1 }), attempt(null, 4, { at: 2 }), other])).toBe(
      60,
    )
  })

  it('falls back to the target tempo, then to 80', () => {
    expect(startingBpm(goal, [])).toBe(84)
    expect(startingBpm({ ...goal, targetBpm: null }, [])).toBe(80)
  })
})

describe('goalStats', () => {
  const a = makeGoal({ id: 'a', targetBpm: 100 })
  const b = makeGoal({ id: 'b', targetBpm: 100 })
  const attempts = [
    makeAttempt({ goalId: 'a', bpm: 100, level: 4 }),
    makeAttempt({ goalId: 'b', bpm: 50, level: 4 }),
  ]

  it('summarises a group of goals', () => {
    const stats = goalStats([a, b], attempts)
    expect(stats.goalCount).toBe(2)
    expect(stats.doneCount).toBe(1)
    expect(stats.progress).toBeCloseTo(0.75)
  })

  it('is all zeros for no goals', () => {
    expect(goalStats([], attempts)).toEqual({ goalCount: 0, doneCount: 0, progress: 0 })
  })
})

describe('lastPracticedAt', () => {
  const a = makeGoal({ id: 'a' })
  const b = makeGoal({ id: 'b' })

  it('is the time of the most recent attempt on any of the goals', () => {
    const attempts = [
      makeAttempt({ goalId: 'a', at: 100 }),
      makeAttempt({ goalId: 'b', at: 300 }),
      makeAttempt({ goalId: 'other', at: 900 }),
    ]
    expect(lastPracticedAt([a, b], attempts)).toBe(300)
  })

  it('is null when nothing has been practiced', () => {
    expect(lastPracticedAt([a], [])).toBeNull()
    expect(lastPracticedAt([], [makeAttempt({ goalId: 'a', at: 5 })])).toBeNull()
  })
})

describe('toPercent', () => {
  it('rounds to a whole percent', () => {
    expect(toPercent(0)).toBe(0)
    expect(toPercent(0.6786)).toBe(68)
    expect(toPercent(1)).toBe(100)
  })
})
