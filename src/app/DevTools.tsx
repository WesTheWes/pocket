import { useState } from 'react'
import { repos } from '../data'
import { createSeedData } from '../data/seed'

/** Development-only helpers. Renders nothing in a production build. */
export function DevTools() {
  const [busy, setBusy] = useState(false)
  if (!import.meta.env.DEV) return null

  async function run(action: () => Promise<void>, confirmation: string) {
    if (!window.confirm(confirmation)) return
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-line pt-6 text-sm text-muted">
      <span className="eyebrow">Dev</span>
      <button
        type="button"
        disabled={busy}
        className="rounded-full border border-line px-4 py-2 hover:text-cream disabled:opacity-50"
        onClick={() =>
          run(
            () => repos.backup.replaceAll(createSeedData(Date.now())),
            'Replace ALL data in this browser with the sample songs?',
          )
        }
      >
        Load sample data
      </button>
      <button
        type="button"
        disabled={busy}
        className="rounded-full border border-line px-4 py-2 hover:text-cream disabled:opacity-50"
        onClick={() => run(() => repos.backup.clear(), 'Delete ALL data in this browser?')}
      >
        Clear all data
      </button>
    </div>
  )
}
