import { describe, expect, it } from 'vitest'
import { addSlot, moveSlot, removeSlot, sameStructure, toSlots, toStructure } from './slots'

let n = 0
const key = () => `k${++n}`

describe('slots', () => {
  it('turns a structure into slots with unique keys, repeats included', () => {
    const slots = toSlots(['verse', 'chorus', 'verse'], key)
    expect(slots.map((s) => s.sectionId)).toEqual(['verse', 'chorus', 'verse'])
    expect(new Set(slots.map((s) => s.key)).size).toBe(3)
  })

  it('round-trips back to a structure', () => {
    const structure = ['intro', 'verse', 'chorus', 'verse', 'chorus']
    expect(toStructure(toSlots(structure, key))).toEqual(structure)
  })

  it('appends a section, allowing repeats', () => {
    const slots = addSlot(toSlots(['verse'], key), 'verse', key)
    expect(toStructure(slots)).toEqual(['verse', 'verse'])
  })

  it('removes only the chosen slot, not every use of that section', () => {
    const slots = toSlots(['verse', 'chorus', 'verse'], key)
    expect(toStructure(removeSlot(slots, slots[0].key))).toEqual(['chorus', 'verse'])
  })

  it('moves a slot down to where another one is', () => {
    const slots = toSlots(['a', 'b', 'c', 'd'], key)
    expect(toStructure(moveSlot(slots, slots[0].key, slots[2].key))).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves a slot up to where another one is', () => {
    const slots = toSlots(['a', 'b', 'c', 'd'], key)
    expect(toStructure(moveSlot(slots, slots[3].key, slots[1].key))).toEqual(['a', 'd', 'b', 'c'])
  })

  it('leaves the order alone when dropped on itself or on nothing', () => {
    const slots = toSlots(['a', 'b'], key)
    expect(moveSlot(slots, slots[0].key, slots[0].key)).toBe(slots)
    expect(moveSlot(slots, slots[0].key, 'missing')).toBe(slots)
    expect(moveSlot(slots, 'missing', slots[0].key)).toBe(slots)
  })

  it('does not mutate its input', () => {
    const slots = toSlots(['a', 'b', 'c'], key)
    const before = toStructure(slots)
    moveSlot(slots, slots[0].key, slots[2].key)
    removeSlot(slots, slots[1].key)
    addSlot(slots, 'z', key)
    expect(toStructure(slots)).toEqual(before)
  })

  it('compares structures by order', () => {
    expect(sameStructure(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(sameStructure(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(sameStructure(['a'], ['a', 'a'])).toBe(false)
  })
})
