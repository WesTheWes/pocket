import { describe, expect, it } from 'vitest'
import { goalDeleteWarning } from './deleteWarning'

describe('goalDeleteWarning', () => {
  it('names the goal and how many attempts go with it', () => {
    expect(goalDeleteWarning('Left hand waltz pattern', 4)).toBe(
      '“Left hand waltz pattern” and its 4 attempts will be removed. This can’t be undone.',
    )
  })

  it('uses the singular for one attempt', () => {
    expect(goalDeleteWarning('Bridge', 1)).toContain('and its 1 attempt will be')
  })

  it('still warns when there are no attempts', () => {
    expect(goalDeleteWarning('Bridge', 0)).toBe('“Bridge” will be removed. This can’t be undone.')
  })
})
