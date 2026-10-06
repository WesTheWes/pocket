import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal, makeSection } from '../test/factories'
import { currentLevel, goalLevel, levelCount, songLevels } from './levels'

const a = makeGoal({ id: 'a', title: 'A', targetBpm: 100, createdAt: 1 })
const b = makeGoal({ id: 'b', title: 'B', targetBpm: 100, createdAt: 2, requires: ['a'] })
const c = makeGoal({ id: 'c', title: 'C', targetBpm: 100, createdAt: 3, requires: ['b', 'a'] })
const d = makeGoal({ id: 'd', title: 'D', targetBpm: 100, createdAt: 4 })
const goals = [a, b, c, d]
const solid = (goalId: string) => makeAttempt({ goalId, bpm: 100, level: 4 })

describe('goalLevel', () => {
  it('is one above the highest goal required', () => {
    expect(goalLevel(a, goals)).toBe(1)
    expect(goalLevel(b, goals)).toBe(2)
    expect(goalLevel(c, goals)).toBe(3)
    expect(goalLevel(d, goals)).toBe(1)
  })

  it('ignores unknown ids and survives a circle', () => {
    const ghost = makeGoal({ id: 'g', requires: ['nope'] })
    expect(goalLevel(ghost, [ghost])).toBe(1)
    const x = makeGoal({ id: 'x', requires: ['y'] })
    const y = makeGoal({ id: 'y', requires: ['x'] })
    expect(goalLevel(x, [x, y])).toBe(1)
  })
})

describe('songLevels', () => {
  it('groups goals by level, lowest first, in goal order within a level', () => {
    const verse = makeSection({ id: 'v', order: 0 })
    const levels = songLevels([c, d, b, { ...a, sectionId: 'v' }], [verse])
    expect(levels.map((l) => [l.level, l.goals.map((g) => g.id)])).toEqual([
      [1, ['d', 'a']],
      [2, ['b']],
      [3, ['c']],
    ])
  })

  it('is empty for no goals', () => {
    expect(songLevels([], [])).toEqual([])
    expect(levelCount([])).toBe(1)
  })
})

describe('currentLevel', () => {
  it('is the lowest level with something to do, or the top once all is done', () => {
    expect(currentLevel(goals, [])).toBe(1)
    expect(currentLevel(goals, [solid('a'), solid('d')])).toBe(2)
    expect(currentLevel(goals, [solid('a'), solid('b'), solid('c'), solid('d')])).toBe(3)
    expect(levelCount(goals)).toBe(3)
  })
})
