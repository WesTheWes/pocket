import { describe, expect, it } from 'vitest'
import { makeSession } from '../test/factories'
import { streakDays, weekDays, weekStart } from './week'

const DAY = 24 * 60 * 60 * 1000
// A Wednesday at noon, local time.
const wednesday = new Date(2026, 9, 7, 12).getTime()
const at = (daysAgo: number) => wednesday - daysAgo * DAY

describe('weekStart', () => {
  it('is the Monday of the week, at local midnight', () => {
    expect(new Date(weekStart(wednesday)).toString()).toMatch(/^Mon Oct 05 2026 00:00:00/)
    const sunday = new Date(2026, 9, 11, 23).getTime()
    expect(new Date(weekStart(sunday)).toString()).toMatch(/^Mon Oct 05 2026/)
  })
})

describe('weekDays', () => {
  it('lists Monday to Sunday with the days you practised, today and the days to come', () => {
    const sessions = [makeSession({ startedAt: at(2) }), makeSession({ startedAt: at(0) })]
    const days = weekDays(sessions, wednesday)
    expect(
      days.map((d) => d.label[0] + (d.practised ? '!' : d.today ? '*' : d.future ? '.' : '-')),
    ).toEqual(['M!', 'T-', 'W!', 'T.', 'F.', 'S.', 'S.'])
    expect(days[2].today).toBe(true)
  })

  it('ignores sessions from other weeks', () => {
    const days = weekDays([makeSession({ startedAt: at(7) })], wednesday)
    expect(days.some((d) => d.practised)).toBe(false)
  })
})

describe('streakDays', () => {
  it('counts the days in a row up to today', () => {
    const sessions = [0, 1, 2, 4].map((d) => makeSession({ startedAt: at(d) }))
    expect(streakDays(sessions, wednesday)).toBe(3)
  })

  it('keeps the streak alive until the end of today', () => {
    const sessions = [1, 2].map((d) => makeSession({ startedAt: at(d) }))
    expect(streakDays(sessions, wednesday)).toBe(2)
  })

  it('is over after a day without practice', () => {
    expect(streakDays([makeSession({ startedAt: at(2) })], wednesday)).toBe(0)
    expect(streakDays([], wednesday)).toBe(0)
  })

  it('counts two sessions on one day once', () => {
    const sessions = [makeSession({ startedAt: at(0) }), makeSession({ startedAt: at(0) + 1000 })]
    expect(streakDays(sessions, wednesday)).toBe(1)
  })
})
