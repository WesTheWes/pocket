import { describe, expect, it } from 'vitest'
import { makeAttempt } from '../test/factories'
import { latestNote } from './notes'

describe('latestNote', () => {
  it('returns the newest attempt that has a note, ignoring other goals', () => {
    const attempts = [
      makeAttempt({ goalId: 'g1', at: 10, note: 'early' }),
      makeAttempt({ goalId: 'g1', at: 30, note: 'late' }),
      makeAttempt({ goalId: 'g1', at: 40, note: '' }),
      makeAttempt({ goalId: 'g2', at: 50, note: 'other goal' }),
    ]
    expect(latestNote('g1', attempts)?.note).toBe('late')
  })

  it('is null when no attempt has a note', () => {
    expect(latestNote('g1', [makeAttempt({ goalId: 'g1', note: '' })])).toBeNull()
    expect(latestNote('g1', [])).toBeNull()
  })
})
