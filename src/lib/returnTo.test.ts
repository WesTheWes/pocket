import { describe, expect, it } from 'vitest'
import { returnTarget, tempoFrom, withReturn } from './returnTo'

describe('returnTarget', () => {
  it('goes back to the screen that said where back should go', () => {
    expect(returnTarget({ returnTo: '/practice/piano-man?goal=g1' }, '/fallback')).toBe(
      '/practice/piano-man?goal=g1',
    )
  })

  it('uses the fallback when nothing was said', () => {
    expect(returnTarget(null, '/fallback')).toBe('/fallback')
    expect(returnTarget(undefined, '/fallback')).toBe('/fallback')
    expect(returnTarget({}, '/fallback')).toBe('/fallback')
    expect(returnTarget('nonsense', '/fallback')).toBe('/fallback')
  })

  it('only accepts paths inside the app', () => {
    expect(returnTarget({ returnTo: 'https://evil.example/' }, '/fallback')).toBe('/fallback')
    expect(returnTarget({ returnTo: '//evil.example/' }, '/fallback')).toBe('/fallback')
    expect(returnTarget({ returnTo: 42 }, '/fallback')).toBe('/fallback')
    expect(returnTarget({ returnTo: '' }, '/fallback')).toBe('/fallback')
  })
})

describe('withReturn', () => {
  it('builds the link state that returnTarget reads', () => {
    expect(returnTarget(withReturn('/practice/x'), '/fallback')).toBe('/practice/x')
  })
})

describe('carrying a tempo along with the link', () => {
  it('passes a tempo in the link state, next to the way back', () => {
    const state = withReturn('/practice/x', { bpm: 96 })
    expect(returnTarget(state, '/fallback')).toBe('/practice/x')
    expect(tempoFrom(state)).toBe(96)
  })

  it('has no tempo unless one was passed', () => {
    expect(tempoFrom(withReturn('/practice/x'))).toBeUndefined()
    expect(tempoFrom(null)).toBeUndefined()
    expect(tempoFrom(undefined)).toBeUndefined()
    expect(tempoFrom({})).toBeUndefined()
  })

  it('ignores anything that is not a whole tempo between 30 and 240', () => {
    for (const bpm of [29, 241, 90.5, NaN, '96', null, -10]) {
      expect(tempoFrom({ returnTo: '/x', bpm })).toBeUndefined()
    }
    expect(tempoFrom({ bpm: 30 })).toBe(30)
    expect(tempoFrom({ bpm: 240 })).toBe(240)
  })
})
