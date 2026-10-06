const pad = (n: number) => String(n).padStart(2, '0')

/** "24:18" under an hour, "1:02:05" from an hour on. Partial seconds are dropped. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

/** "48 min", "1 h 12 min", "0 min": practice totals, to the minute. */
export function formatMinutes(ms: number): string {
  const minutes = Math.round(Math.max(0, ms) / 60_000)
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`
}
