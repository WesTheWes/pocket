import { createContext, useContext } from 'react'

export interface ToastApi {
  /** Shows a short confirmation. The newest message replaces any that is showing. */
  notify: (message: string) => void
}

// Without a provider (a component rendered on its own), notifying quietly does nothing.
export const ToastContext = createContext<ToastApi>({ notify: () => {} })

export function useToast(): ToastApi {
  return useContext(ToastContext)
}
