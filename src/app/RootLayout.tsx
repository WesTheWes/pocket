import { Outlet } from 'react-router'
import { ToastProvider } from '../components/Toast'

/** Wraps every screen, so app-wide things (like the toast) outlast a navigation. */
export function RootLayout() {
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  )
}
