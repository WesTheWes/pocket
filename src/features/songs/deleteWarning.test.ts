import { describe, expect, it } from 'vitest'
import { deleteWarning, sectionDeleteWarning } from './deleteWarning'

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

describe('sectionDeleteWarning', () => {
  it('mentions goals and the structure when both apply', () => {
    expect(sectionDeleteWarning(2, 3)).toBe(
      'Its 2 goals and their progress history will be removed, and it will be taken out of the song structure. This can’t be undone.',
    )
  })

  it('uses the singular for one goal', () => {
    expect(sectionDeleteWarning(1, 1)).toContain('Its 1 goal and their progress history')
  })

  it('mentions only goals when the section is not in the structure', () => {
    expect(sectionDeleteWarning(2, 0)).toBe(
      'Its 2 goals and their progress history will be removed. This can’t be undone.',
    )
  })

  it('mentions only the structure when there are no goals', () => {
    expect(sectionDeleteWarning(0, 2)).toBe(
      'It will be taken out of the song structure. This can’t be undone.',
    )
  })

  it('still warns when there is nothing attached', () => {
    expect(sectionDeleteWarning(0, 0)).toBe('The section will be removed. This can’t be undone.')
  })
})
