import { arrayMove } from '@dnd-kit/sortable'

/** One position in a song's play order. The key is what makes repeated sections draggable. */
export interface Slot {
  key: string
  sectionId: string
}

export function toSlots(structure: string[], newKey: () => string): Slot[] {
  return structure.map((sectionId) => ({ key: newKey(), sectionId }))
}

export function toStructure(slots: Slot[]): string[] {
  return slots.map((slot) => slot.sectionId)
}

export function addSlot(slots: Slot[], sectionId: string, newKey: () => string): Slot[] {
  return [...slots, { key: newKey(), sectionId }]
}

export function removeSlot(slots: Slot[], key: string): Slot[] {
  return slots.filter((slot) => slot.key !== key)
}

/** Moves the `fromKey` slot to the position of the `toKey` slot. Returns the same array if no-op. */
export function moveSlot(slots: Slot[], fromKey: string, toKey: string): Slot[] {
  const from = slots.findIndex((slot) => slot.key === fromKey)
  const to = slots.findIndex((slot) => slot.key === toKey)
  if (from === -1 || to === -1 || from === to) return slots
  return arrayMove(slots, from, to)
}

export function sameStructure(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}
