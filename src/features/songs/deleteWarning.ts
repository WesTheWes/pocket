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
