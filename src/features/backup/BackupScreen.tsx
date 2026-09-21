import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/BottomSheet'
import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/toastContext'
import { repos } from '../../data'
import { useAllAttempts, useAllGoals, useSongs } from '../../data/hooks'
import {
  backupFilename,
  createBackup,
  mergeMissing,
  parseBackup,
  serializeBackup,
  summarize,
  type BackupFile,
} from '../../domain/backup'
import { downloadTextFile } from '../../lib/download'
import { formatAttemptDate } from '../../lib/formatDate'
import { plural } from '../../lib/plural'
import { paths } from '../../paths'
import { getLastBackup, setLastBackup } from './lastBackup'

/** A real backup is a few hundred KB at most; refuse anything far beyond that without reading it. */
const MAX_FILE_BYTES = 50 * 1024 * 1024

export function BackupScreen() {
  return (
    <Page>
      <TopBar backTo={paths.home} title="Backup" />
      <p className="px-5 pt-2 text-[15px] text-muted">
        Your songs and progress are stored only in this browser. Download a backup to keep them
        safe, or to move them to another device.
      </p>
      <div className="flex flex-col gap-4 px-5 pb-12 pt-5">
        <ExportCard />
        <RestoreCard />
      </div>
    </Page>
  )
}

const cardClass = 'rounded-card bg-surface p-5'

function ExportCard() {
  const { notify } = useToast()
  const songs = useSongs()
  const goals = useAllGoals()
  const attempts = useAllAttempts()
  const [lastBackup, setLast] = useState(getLastBackup)
  const [now] = useState(() => Date.now())
  const [error, setError] = useState<string>()

  async function download() {
    setError(undefined)
    try {
      const at = Date.now()
      const data = await repos.backup.exportAll()
      downloadTextFile(
        backupFilename(at),
        serializeBackup(createBackup(data, at)),
        'application/json',
      )
      setLastBackup(at)
      setLast(at)
      notify('Backup downloaded')
    } catch {
      setError('Couldn’t create the backup. Please try again.')
    }
  }

  const empty = !!songs && songs.length === 0

  return (
    <section aria-labelledby="export-heading" className={cardClass}>
      <h2 id="export-heading" className="font-display text-2xl">
        Back up your data
      </h2>
      <p className="mt-2 text-sm text-muted">
        {empty
          ? 'Nothing to back up yet.'
          : songs && goals && attempts
            ? `${plural(songs.length, 'song')} · ${plural(goals.length, 'goal')} · ${plural(attempts.length, 'attempt')}`
            : ' '}
      </p>
      <p className="mt-1 text-sm text-muted">
        {lastBackup === null
          ? 'You haven’t backed up yet.'
          : `Last backup: ${formatAttemptDate(lastBackup, now)}`}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-pink">
          {error}
        </p>
      )}
      <Button icon="download" className="mt-4 w-full" disabled={!songs || empty} onClick={download}>
        Download backup
      </Button>
    </section>
  )
}

type Picked = { name: string; backup: BackupFile } | { name: string; error: string }

function RestoreCard() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const songs = useSongs()
  const goals = useAllGoals()
  const attempts = useAllAttempts()

  const [picked, setPicked] = useState<Picked | null>(null)
  // Changing the key gives a fresh file input, so the same file can be chosen again.
  const [inputKey, setInputKey] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [now] = useState(() => Date.now())

  function reset() {
    setPicked(null)
    setError(undefined)
    setConfirming(false)
    setInputKey((key) => key + 1)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(undefined)
    if (file.size > MAX_FILE_BYTES) {
      setPicked({ name: file.name, error: 'That file is too large to be a Pocket backup.' })
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      setPicked({ name: file.name, error: 'Couldn’t read that file.' })
      return
    }
    const result = parseBackup(text)
    setPicked(
      result.ok
        ? { name: file.name, backup: result.backup }
        : { name: file.name, error: result.error },
    )
  }

  async function restore(mode: 'add' | 'replace', backup: BackupFile) {
    setBusy(true)
    setError(undefined)
    try {
      if (mode === 'add') {
        const result = await repos.backup.addMissing(backup.data)
        notify(`Added ${plural(result.added, 'song')}`)
      } else {
        await repos.backup.replaceAll(backup.data)
        notify(`Restored ${plural(backup.data.songs.length, 'song')}`)
      }
      navigate(paths.home)
    } catch {
      setError(
        mode === 'add'
          ? 'Couldn’t add the songs. Nothing was changed.'
          : 'Couldn’t restore the backup. Nothing was changed.',
      )
    } finally {
      setBusy(false)
    }
  }

  const backup = picked && 'backup' in picked ? picked.backup : undefined
  const merge =
    backup && songs ? mergeMissing(new Set(songs.map((s) => s.id)), backup.data) : undefined
  const counts = backup ? summarize(backup.data) : undefined

  return (
    <section aria-labelledby="restore-heading" className={cardClass}>
      <h2 id="restore-heading" className="font-display text-2xl">
        Restore from a backup
      </h2>

      {!backup && (
        <>
          <p className="mt-2 text-sm text-muted">Choose a Pocket backup file (.json).</p>
          {picked && 'error' in picked && (
            <p role="alert" className="mt-3 text-sm text-pink">
              {picked.error}
            </p>
          )}
          <label className="mt-4 flex h-[52px] w-full cursor-pointer items-center justify-center rounded-full border border-line bg-surface-2 px-[22px] text-base font-semibold hover:bg-line has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-yellow">
            <input
              key={inputKey}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
            Choose backup file
          </label>
        </>
      )}

      {backup && counts && merge && (
        <section aria-label="Backup file" className="mt-3">
          <p className="break-all font-medium">{picked?.name}</p>
          <p className="mt-1 text-sm text-muted">
            Made {formatAttemptDate(backup.exportedAt, now)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {plural(counts.songs, 'song')} · {plural(counts.goals, 'goal')} ·{' '}
            {plural(counts.attempts, 'attempt')}
          </p>
          <p className="mt-3 text-sm">
            {merge.added === 0
              ? 'You already have every song in this file.'
              : merge.skipped === 0
                ? `${plural(merge.added, 'new song')}`
                : `${plural(merge.added, 'new song')}, ${merge.skipped} already here`}
          </p>
          {merge.added > 0 && (
            <p className="mt-1 text-xs text-muted">
              Adding never changes the songs you already have.
            </p>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-pink">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2.5">
            {merge.added > 0 && (
              <Button disabled={busy} onClick={() => restore('add', backup)}>
                {merge.added === 1 ? 'Add the new song' : `Add the ${merge.added} new songs`}
              </Button>
            )}
            <Button variant="danger" disabled={busy} onClick={() => setConfirming(true)}>
              Replace everything
            </Button>
            <Button variant="secondary" disabled={busy} onClick={reset}>
              Cancel
            </Button>
          </div>

          <ConfirmSheet
            open={confirming}
            onOpenChange={setConfirming}
            title="Replace everything?"
            description={`This replaces your ${plural(songs?.length ?? 0, 'song')}, ${plural(goals?.length ?? 0, 'goal')} and ${plural(attempts?.length ?? 0, 'attempt')} here with the ${plural(counts.songs, 'song')} in the file. This can’t be undone, so download a backup first if you’re not sure.`}
            confirmLabel="Replace everything"
            onConfirm={() => restore('replace', backup)}
            busy={busy}
            error={error}
          />
        </section>
      )}
    </section>
  )
}
