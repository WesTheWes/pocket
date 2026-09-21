import { describe, expect, it } from 'vitest'
import { returnTarget, withReturn } from './returnTo'

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
