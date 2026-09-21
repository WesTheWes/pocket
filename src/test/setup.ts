import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Screens read from a fake IndexedDB, and hundreds of tests share the CPU, so the default one
// second is tight. This only lengthens how long a test waits for something that should appear.
configure({ asyncUtilTimeout: 4000 })

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
})
