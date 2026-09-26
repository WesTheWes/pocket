import { useCallback, useState } from 'react'

/**
 * One of a fixed set of string options, remembered in the browser (localStorage) between visits.
 * Falls back to `fallback` when nothing (or something unknown) is stored, and still works, just
 * without remembering, when storage is unavailable.
 */
export function useStoredChoice<T extends string>(
  key: string,
  options: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return options.find((option) => option === stored) ?? fallback
    } catch {
      return fallback
    }
  })

  const set = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(key, next)
      } catch {
        // Storage can be blocked (private mode); the choice just lasts until the page closes.
      }
    },
    [key],
  )

  return [value, set]
}
