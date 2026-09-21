const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`

/** The consequence line in the "Delete song?" confirmation, with the real counts. */
export function deleteWarning(sectionCount: number, goalCount: number): string {
  const undone = 'This can’t be undone.'
  if (sectionCount === 0 && goalCount === 0) {
    return `The song and its progress history will be removed. ${undone}`
  }
  const parts = [
    ...(sectionCount > 0 ? [plural(sectionCount, 'section')] : []),
    ...(goalCount > 0 ? [plural(goalCount, 'goal')] : []),
  ]
  return `Its ${parts.join(', ')} and all progress history will be removed. ${undone}`
}

/** The consequence line in the "Delete section?" confirmation. */
export function sectionDeleteWarning(goalCount: number, structureSlots: number): string {
  const undone = 'This can’t be undone.'
  const leavesStructure = 'it will be taken out of the song structure'

  if (goalCount > 0) {
    const goals = `Its ${plural(goalCount, 'goal')} and their progress history will be removed`
    return structureSlots > 0
      ? `${goals}, and ${leavesStructure}. ${undone}`
      : `${goals}. ${undone}`
  }
  if (structureSlots > 0) return `It will be taken out of the song structure. ${undone}`
  return `The section will be removed. ${undone}`
}
