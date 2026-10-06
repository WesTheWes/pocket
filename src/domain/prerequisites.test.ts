import { describe, expect, it } from 'vitest'
import { makeGoal } from '../test/factories'
import { lockText, requirementCycles, wouldCycle } from './prerequisites'

const a = makeGoal({ id: 'a', title: 'A', requires: [] })
const b = makeGoal({ id: 'b', title: 'B', requires: ['a'] })
const c = makeGoal({ id: 'c', title: 'C', requires: ['b'] })

describe('wouldCycle', () => {
  it('is false for a chain that never comes back', () => {
    expect(wouldCycle('c', ['b'], [a, b, c])).toBe(false)
    expect(wouldCycle('a', [], [a, b, c])).toBe(false)
  })

  it('is true when the chain leads back to the goal, directly or through others', () => {
    expect(wouldCycle('a', ['a'], [a, b, c])).toBe(true)
    expect(wouldCycle('a', ['b'], [a, b, c])).toBe(true)
    expect(wouldCycle('a', ['c'], [a, b, c])).toBe(true)
  })

  it('ignores ids that are not in the list', () => {
    expect(wouldCycle('a', ['ghost'], [a, b, c])).toBe(false)
  })
})

describe('requirementCycles', () => {
  it('names every goal in a circle and nothing else', () => {
    const x = makeGoal({ id: 'x', requires: ['y'] })
    const y = makeGoal({ id: 'y', requires: ['x'] })
    expect(requirementCycles([a, b, c, x, y])).toEqual(['x', 'y'])
  })
})

describe('lockText', () => {
  it('names one, two, or two and a count', () => {
    expect(lockText([])).toBe('')
    expect(lockText([a])).toBe('Finish A first')
    expect(lockText([a, b])).toBe('Finish A and B first')
    expect(lockText([a, b, c, makeGoal({ title: 'D' })])).toBe('Finish A, B and 2 more first')
  })
})
