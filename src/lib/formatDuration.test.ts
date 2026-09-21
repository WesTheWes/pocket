import { describe, expect, it } from 'vitest'
import { formatDuration } from './formatDuration'

const s = (n: number) => n * 1000

describe('formatDuration', () => {
  it('shows minutes and seconds under an hour', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(s(5))).toBe('00:05')
    expect(formatDuration(s(65))).toBe('01:05')
    expect(formatDuration(s(24 * 60 + 18))).toBe('24:18')
    expect(formatDuration(s(59 * 60 + 59))).toBe('59:59')
  })

  it('adds hours from one hour on', () => {
    expect(formatDuration(s(3600))).toBe('1:00:00')
    expect(formatDuration(s(3725))).toBe('1:02:05')
    expect(formatDuration(s(10 * 3600 + 61))).toBe('10:01:01')
  })

  it('drops the fraction of a second rather than rounding up', () => {
    expect(formatDuration(59_999)).toBe('00:59')
    expect(formatDuration(999)).toBe('00:00')
  })

  it('never goes negative', () => {
    expect(formatDuration(-5000)).toBe('00:00')
  })
})
