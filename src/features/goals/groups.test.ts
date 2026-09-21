import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal, makeSection } from '../../test/factories'
import { filterCounts, groupGoals } from './groups'

const verse = makeSection({ id: 'verse', name: 'Verse', order: 0 })
const chorus = makeSection({ id: 'chorus', name: 'Chorus', order: 1 })
const sections = [chorus, verse] // deliberately out of order

const whole = makeGoal({ id: 'whole', sectionId: null, targetBpm: 100, createdAt: 1 })
const v1 = makeGoal({ id: 'v1', sectionId: 'verse', targetBpm: 100, createdAt: 3 })
const v2 = makeGoal({ id: 'v2', sectionId: 'verse', targetBpm: 100, createdAt: 2 })
const goals = [v1, whole, v2]

// Only v2 is done.
const attempts = [makeAttempt({ goalId: 'v2', bpm: 100, level: 4 })]

describe('filterCounts', () => {
  it('counts all, to do, and done', () => {
    expect(filterCounts(goals, attempts)).toEqual({ all: 3, todo: 2, done: 1 })
  })
})

describe('groupGoals', () => {
  it('puts the whole song first, then each section in order, including empty ones', () => {
    const groups = groupGoals(goals, sections, attempts, 'all')
    expect(groups.map((g) => [g.title, g.goals.length])).toEqual([
      ['Whole song', 1],
      ['Verse', 2],
      ['Chorus', 0],
    ])
  })

  it('orders goals inside a group by when they were created', () => {
    const [, verseGroup] = groupGoals(goals, sections, attempts, 'all')
    expect(verseGroup.goals.map((g) => g.id)).toEqual(['v2', 'v1'])
  })

  it('carries the section id, or null for the whole song', () => {
    const groups = groupGoals(goals, sections, attempts, 'all')
    expect(groups.map((g) => g.sectionId)).toEqual([null, 'verse', 'chorus'])
  })

  it('filters to what is left to do, hiding groups with nothing in them', () => {
    const groups = groupGoals(goals, sections, attempts, 'todo')
    expect(groups.map((g) => [g.title, g.goals.map((x) => x.id)])).toEqual([
      ['Whole song', ['whole']],
      ['Verse', ['v1']],
    ])
  })

  it('filters to what is done', () => {
    const groups = groupGoals(goals, sections, attempts, 'done')
    expect(groups.map((g) => [g.title, g.goals.map((x) => x.id)])).toEqual([['Verse', ['v2']]])
  })

  it('ignores a goal whose section no longer exists rather than crashing', () => {
    const orphan = makeGoal({ id: 'orphan', sectionId: 'gone' })
    const groups = groupGoals([orphan], sections, [], 'all')
    expect(groups.flatMap((g) => g.goals)).toEqual([])
  })
})
