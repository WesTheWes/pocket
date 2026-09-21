import { describe, expect, it } from 'vitest'
import { deleteWarning } from './deleteWarning'

describe('deleteWarning', () => {
  it('names the sections and goals that will go', () => {
    expect(deleteWarning(5, 8)).toBe(
      'Its 5 sections, 8 goals and all progress history will be removed. This can’t be undone.',
    )
  })

  it('uses singular nouns for one', () => {
    expect(deleteWarning(1, 1)).toContain('Its 1 section, 1 goal and')
  })

  it('leaves out a count that is zero', () => {
    expect(deleteWarning(0, 3)).toContain('Its 3 goals and')
    expect(deleteWarning(2, 0)).toContain('Its 2 sections and')
  })

  it('still warns about an empty song', () => {
    expect(deleteWarning(0, 0)).toBe(
      'The song and its progress history will be removed. This can’t be undone.',
    )
  })
})
