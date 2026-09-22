import { Outlet } from 'react-router'
import { ToastProvider } from '../components/Toast'
import { PwaUpdater } from './PwaUpdater'

/** Wraps every screen, so app-wide things (like the toast) outlast a navigation. */
export function RootLayout() {
  return (
    <ToastProvider>
      <PwaUpdater />
      <Outlet />
    </ToastProvider>
  )
}
