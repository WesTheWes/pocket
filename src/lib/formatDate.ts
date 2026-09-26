const DAY = 24 * 60 * 60 * 1000

const startOfDay = (time: number) => {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** "Sep 21 · Today", "Sep 20 · Yesterday", "Sep 18", or "Dec 31, 2025" for another year. */
export function formatAttemptDate(at: number, now: number): string {
  const date = new Date(at)
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  const label = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  // Rounded, so a daylight-saving change (a 23 or 25 hour day) still counts as one day.
  const daysAgo = Math.round((startOfDay(now) - startOfDay(at)) / DAY)
  if (daysAgo === 0) return `${label} · Today`
  if (daysAgo === 1) return `${label} · Yesterday`
  return label
}

/** "Today", "Yesterday", "4 days ago", "3 weeks ago", "5 months ago", "2 years ago". */
export function formatTimeAgo(at: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / DAY)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  const ago = (count: number, unit: string) => `${count} ${unit}${count === 1 ? '' : 's'} ago`
  if (days < 14) return ago(days, 'day')
  if (days < 60) return ago(Math.floor(days / 7), 'week')
  if (days < 730) return ago(Math.floor(days / 30), 'month')
  return ago(Math.floor(days / 365), 'year')
}
