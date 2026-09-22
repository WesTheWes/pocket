import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from '../components/toastContext'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Registers the service worker. A new version installs and waits quietly (registerType:
 * 'prompt' in vite.config.ts) rather than forcing a reload, since that could cut off a live
 * practice session (running metronome, ticking timer). Once it has taken over, the toast says so.
 */
export function PwaUpdater() {
  const { notify } = useToast()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Runs for as long as the tab is open; there is nothing to tear down before then.
      if (registration) setInterval(() => void registration.update(), CHECK_INTERVAL_MS)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      notify('A new version of Pocket is ready. It will be used next time you open the app.')
      setNeedRefresh(false)
    }
  }, [needRefresh, notify, setNeedRefresh])

  return null
}
