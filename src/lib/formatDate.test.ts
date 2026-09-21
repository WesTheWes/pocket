import { describe, expect, it } from 'vitest'
import { formatAttemptDate } from './formatDate'

// Local-time dates, so the tests pass in any timezone.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()
const now = at(2026, 9, 21, 15)

describe('formatAttemptDate', () => {
  it('marks today, whatever the time of day', () => {
    expect(formatAttemptDate(at(2026, 9, 21, 0), now)).toBe('Sep 21 · Today')
    expect(formatAttemptDate(at(2026, 9, 21, 23), now)).toBe('Sep 21 · Today')
  })

  it('marks yesterday', () => {
    expect(formatAttemptDate(at(2026, 9, 20, 23), now)).toBe('Sep 20 · Yesterday')
  })

  it('shows just the date for anything older this year', () => {
    expect(formatAttemptDate(at(2026, 9, 18), now)).toBe('Sep 18')
    expect(formatAttemptDate(at(2026, 1, 3), now)).toBe('Jan 3')
  })

  it('adds the year for other years', () => {
    expect(formatAttemptDate(at(2025, 12, 31), now)).toBe('Dec 31, 2025')
  })

  it('treats a time just past midnight as a new day', () => {
    const lateNight = at(2026, 9, 21, 23)
    expect(formatAttemptDate(at(2026, 9, 21, 0), lateNight)).toBe('Sep 21 · Today')
    expect(formatAttemptDate(at(2026, 9, 20, 23), lateNight)).toBe('Sep 20 · Yesterday')
  })
})
