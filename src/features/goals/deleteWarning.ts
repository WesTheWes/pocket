/** The consequence line in the "Delete this goal?" confirmation. */
export function goalDeleteWarning(title: string, attemptCount: number): string {
  const undone = 'This can’t be undone.'
  if (attemptCount === 0) return `“${title}” will be removed. ${undone}`
  const attempts = `${attemptCount} attempt${attemptCount === 1 ? '' : 's'}`
  return `“${title}” and its ${attempts} will be removed. ${undone}`
}
