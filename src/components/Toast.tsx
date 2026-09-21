import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
import { ToastContext } from './toastContext'

const DEFAULT_DURATION_MS = 3000

/**
 * Hosts the app's one toast. It lives at the root, above the router's screens, so a message
 * survives the navigation that often follows it (Save attempt, then back to Practice).
 */
export function ToastProvider({
  children,
  durationMs = DEFAULT_DURATION_MS,
}: {
  children: ReactNode
  durationMs?: number
}) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const counter = useRef(0)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const notify = useCallback(
    (message: string) => {
      clearTimeout(timer.current)
      setToast({ id: ++counter.current, message })
      timer.current = setTimeout(() => setToast(null), durationMs)
    },
    [durationMs],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  const api = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        // Above sheets (z-50), and never in the way of taps on what is underneath.
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-5">
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-surface-2 py-0 pl-4 pr-1 text-sm font-medium shadow-lg shadow-black/40"
          >
            <span className="text-yellow">
              <Icon name="check" size={16} />
            </span>
            {toast.message}
            <IconButton icon="close" label="Dismiss" onClick={dismiss} className="text-muted" />
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
