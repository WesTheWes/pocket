const KEY = 'pocket:last-backup'

/** When a backup was last downloaded from this browser, or null if never. */
export function getLastBackup(): number | null {
  try {
    const stored = localStorage.getItem(KEY)
    const at = stored === null ? NaN : Number(stored)
    return Number.isFinite(at) && at > 0 ? at : null
  } catch {
    return null
  }
}

export function setLastBackup(at: number): void {
  try {
    localStorage.setItem(KEY, String(at))
  } catch {
    // Storage can be blocked; the reminder just will not be remembered.
  }
}
