import { useCallback, useState } from 'react'

/**
 * A true/false setting that is remembered in the browser (localStorage) between visits. It falls
 * back to `fallback` when nothing is stored, and still works, just without remembering, when
 * storage is unavailable.
 */
export function useStoredFlag(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored === '1' ? true : stored === '0' ? false : fallback
    } catch {
      return fallback
    }
  })

  const set = useCallback(
    (next: boolean) => {
      setValue(next)
      try {
        localStorage.setItem(key, next ? '1' : '0')
      } catch {
        // Storage can be blocked (private mode); the setting just lasts until the page closes.
      }
    },
    [key],
  )

  return [value, set]
}
