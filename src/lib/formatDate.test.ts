import { describe, expect, it } from 'vitest'
import { formatAttemptDate, formatTimeAgo } from './formatDate'

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

describe('formatTimeAgo', () => {
  it('says Today and Yesterday by calendar day', () => {
    expect(formatTimeAgo(at(2026, 9, 21, 0), now)).toBe('Today')
    expect(formatTimeAgo(at(2026, 9, 20, 23), now)).toBe('Yesterday')
  })

  it('counts days for the first two weeks', () => {
    expect(formatTimeAgo(at(2026, 9, 17), now)).toBe('4 days ago')
    expect(formatTimeAgo(at(2026, 9, 8), now)).toBe('13 days ago')
  })

  it('counts weeks, then months, then years', () => {
    expect(formatTimeAgo(at(2026, 9, 7), now)).toBe('2 weeks ago')
    expect(formatTimeAgo(at(2026, 6, 21), now)).toBe('3 months ago')
    expect(formatTimeAgo(at(2024, 9, 1), now)).toBe('2 years ago')
  })
})
