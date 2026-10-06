import { useCallback, useState } from 'react'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * A number remembered in the browser (localStorage) between visits, kept within `min` and
 * `max`. Falls back to `fallback` when nothing usable is stored, and still works, just without
 * remembering, when storage is unavailable.
 */
export function useStoredNumber(
  key: string,
  fallback: number,
  { min, max }: { min: number; max: number },
): [number, (value: number) => void] {
  const [value, setValue] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(key)
      const parsed = stored === null ? NaN : Number(stored)
      return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback
    } catch {
      return fallback
    }
  })

  const set = useCallback(
    (next: number) => {
      const clamped = clamp(next, min, max)
      setValue(clamped)
      try {
        localStorage.setItem(key, String(clamped))
      } catch {
        // Storage can be blocked (private mode); the value just lasts until the page closes.
      }
    },
    [key, min, max],
  )

  return [value, set]
}
