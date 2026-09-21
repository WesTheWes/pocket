import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { repos } from '../../data'
import { createSeedData } from '../../data/seed'
import {
  backupFilename,
  createBackup,
  parseBackup,
  serializeBackup,
  summarize,
} from '../../domain/backup'
import { renderApp } from '../../test/renderApp'

/** What the browser was asked to download. */
let downloads: Array<{ filename: string; blob: Blob }>

beforeEach(() => {
  downloads = []
  let last: Blob
  URL.createObjectURL = vi.fn((blob: Blob) => {
    last = blob
    return 'blob:fake'
  })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ filename: this.download, blob: last })
  })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await repos.backup.clear()
})

async function loadSamples() {
  await repos.backup.replaceAll(createSeedData(Date.now()))
}

const backupFile = (text: string, name = 'pocket-backup.json') =>
  new File([text], name, { type: 'application/json' })

async function choose(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(await screen.findByLabelText('Choose backup file'), file)
}

/** A valid backup file with the sample songs, made "now". */
function sampleBackupText() {
  return serializeBackup(createBackup(createSeedData(Date.now()), Date.now()))
}

describe('backing up', () => {
  it('shows what will be saved', async () => {
    await loadSamples()
    renderApp('/backup')
    const counts = summarize(await repos.backup.exportAll())
    expect(
      await screen.findByText(
        `${counts.songs} songs · ${counts.goals} goals · ${counts.attempts} attempts`,
      ),
    ).toBeInTheDocument()
  })

  it('downloads everything as a dated file that can be read back', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/backup')
    await user.click(await screen.findByRole('button', { name: 'Download backup' }))

    // Building the file is asynchronous, so wait for the download to be requested.
    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(downloads[0].filename).toBe(backupFilename(Date.now()))
    const result = parseBackup(await downloads[0].blob.text())
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(summarize(result.backup.data)).toEqual(summarize(await repos.backup.exportAll()))
    expect(await screen.findByRole('status')).toHaveTextContent('Backup downloaded')
  })

  it('remembers when you last backed up', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const first = renderApp('/backup')
    expect(await screen.findByText(/haven’t backed up yet/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Download backup' }))
    expect(await screen.findByText(/Last backup:.*Today/)).toBeInTheDocument()
    first.unmount()

    renderApp('/backup')
    expect(await screen.findByText(/Last backup:.*Today/)).toBeInTheDocument()
  })

  it('has nothing to save when there are no songs', async () => {
    renderApp('/backup')
    expect(await screen.findByText(/Nothing to back up yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download backup' })).toBeDisabled()
  })
})

describe('restoring: choosing a file', () => {
  it('shows what is in the file before doing anything', async () => {
    const user = userEvent.setup()
    renderApp('/backup')
    await choose(user, backupFile(sampleBackupText(), 'my-songs.json'))

    const preview = await screen.findByRole('region', { name: 'Backup file' })
    expect(within(preview).getByText('my-songs.json')).toBeInTheDocument()
    expect(within(preview).getByText(/5 songs/)).toBeInTheDocument()
    expect(within(preview).getByText(/Made .*Today/)).toBeInTheDocument()
    expect(await repos.songs.list()).toEqual([])
  })

  it.each([
    ['text that is not JSON', 'hello there', /isn.t valid JSON/],
    ['JSON from something else', '{"name":"other app"}', /isn.t a Pocket backup/],
    [
      'a backup from a newer Pocket',
      JSON.stringify({ ...JSON.parse(sampleBackupText()), version: 9 }),
      /newer version/,
    ],
    [
      'a damaged backup',
      JSON.stringify({ ...JSON.parse(sampleBackupText()), data: { songs: 'nope' } }),
      /damaged/,
    ],
  ])(
    'explains a file that is %s, and offers no way to restore it',
    async (_name, text, message) => {
      const user = userEvent.setup()
      renderApp('/backup')
      await choose(user, backupFile(text))

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(screen.queryByRole('button', { name: /Replace everything/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Add songs/ })).not.toBeInTheDocument()
    },
  )

  it('refuses a backup whose pieces do not fit together', async () => {
    const backup = JSON.parse(sampleBackupText())
    backup.data.goals[0].songId = 'nowhere'
    const user = userEvent.setup()
    renderApp('/backup')
    await choose(user, backupFile(JSON.stringify(backup)))
    expect(await screen.findByRole('alert')).toHaveTextContent(/inconsistent/)
  })

  it('lets you pick a different file after a bad one', async () => {
    const user = userEvent.setup()
    renderApp('/backup')
    await choose(user, backupFile('nope'))
    await screen.findByRole('alert')
    await choose(user, backupFile(sampleBackupText()))
    expect(await screen.findByRole('region', { name: 'Backup file' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('refuses a file far too big to be a backup, without reading it', async () => {
    const huge = backupFile('{}')
    Object.defineProperty(huge, 'size', { value: 200 * 1024 * 1024 })
    const user = userEvent.setup()
    renderApp('/backup')
    await choose(user, huge)
    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/)
  })

  it('can be cancelled', async () => {
    const user = userEvent.setup()
    renderApp('/backup')
    await choose(user, backupFile(sampleBackupText()))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('region', { name: 'Backup file' })).not.toBeInTheDocument()
  })
})

describe('restoring: adding the songs you do not have', () => {
  async function withOneSong() {
    const song = await repos.songs.create({ title: 'Local only' })
    const data = createSeedData(Date.now())
    // The backup also contains a song with the same id as one already here.
    data.songs.push({
      ...data.songs[0],
      id: song.id,
      title: 'Different title in the backup',
      structure: [],
    })
    return { song, text: serializeBackup(createBackup(data, Date.now())) }
  }

  it('says how many are new and how many are already here', async () => {
    const { text } = await withOneSong()
    const user = userEvent.setup()
    renderApp('/backup')
    await choose(user, backupFile(text))
    const preview = await screen.findByRole('region', { name: 'Backup file' })
    expect(within(preview).getByText('5 new songs, 1 already here')).toBeInTheDocument()
  })

  it('adds only the new ones, leaves your own alone, and goes Home', async () => {
    const { song, text } = await withOneSong()
    const user = userEvent.setup()
    const { router } = renderApp('/backup')
    await choose(user, backupFile(text))
    await user.click(await screen.findByRole('button', { name: 'Add the 5 new songs' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByRole('status')).toHaveTextContent('Added 5 songs')
    expect((await repos.songs.list()).map((s) => s.title).sort()).toEqual(
      [
        'Autumn Leaves',
        "Don't Stop Believin'",
        'Local only',
        'Piano Man',
        'Rocket Man',
        'Sir Duke',
      ].sort(),
    )
    expect((await repos.songs.get(song.id))?.title).toBe('Local only')
  })

  it('offers nothing to add when you already have every song', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/backup')
    await choose(user, backupFile(sampleBackupText()))
    const preview = await screen.findByRole('region', { name: 'Backup file' })
    expect(
      within(preview).getByText(/You already have every song in this file/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Add/ })).not.toBeInTheDocument()
  })
})

describe('restoring: replacing everything', () => {
  it('asks first, saying what will be lost and what will replace it', async () => {
    await repos.songs.create({ title: 'Mine' })
    const user = userEvent.setup()
    renderApp('/backup')
    await choose(user, backupFile(sampleBackupText()))
    await user.click(await screen.findByRole('button', { name: 'Replace everything' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Replace everything?' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent('1 song')
    expect(dialog).toHaveTextContent('5 songs in the file')
    expect(dialog).toHaveTextContent('can’t be undone')
    expect(await repos.songs.list()).toHaveLength(1)
  })

  it('changes nothing if you cancel', async () => {
    await repos.songs.create({ title: 'Mine' })
    const user = userEvent.setup()
    renderApp('/backup')
    await choose(user, backupFile(sampleBackupText()))
    await user.click(await screen.findByRole('button', { name: 'Replace everything' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await repos.songs.list()).map((s) => s.title)).toEqual(['Mine'])
  })

  it('replaces your data with the backup, then goes Home', async () => {
    await repos.songs.create({ title: 'Mine' })
    const user = userEvent.setup()
    const { router } = renderApp('/backup')
    await choose(user, backupFile(sampleBackupText()))
    await user.click(await screen.findByRole('button', { name: 'Replace everything' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Replace everything' }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByRole('status')).toHaveTextContent('Restored 5 songs')
    expect((await repos.songs.list()).map((s) => s.title)).not.toContain('Mine')
    expect(await repos.songs.list()).toHaveLength(5)
    expect(await screen.findByText('5 songs')).toBeInTheDocument()
  })

  it('says so, and keeps your data, if the restore fails', async () => {
    await repos.songs.create({ title: 'Mine' })
    vi.spyOn(repos.backup, 'replaceAll').mockRejectedValue(new Error('disk full'))
    const user = userEvent.setup()
    renderApp('/backup')
    await choose(user, backupFile(sampleBackupText()))
    await user.click(await screen.findByRole('button', { name: 'Replace everything' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Replace everything' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/Nothing was changed/)
    expect((await repos.songs.list()).map((s) => s.title)).toEqual(['Mine'])
  })
})

describe('a full round trip through the app', () => {
  it('a backup you download brings everything back after your data is wiped', async () => {
    await loadSamples()
    const before = await repos.backup.exportAll()
    const user = userEvent.setup()

    const first = renderApp('/backup')
    await user.click(await screen.findByRole('button', { name: 'Download backup' }))
    await waitFor(() => expect(downloads).toHaveLength(1))
    const text = await downloads[0].blob.text()
    first.unmount()

    await repos.backup.clear()
    expect(await repos.songs.list()).toEqual([])

    const second = renderApp('/backup')
    await choose(user, backupFile(text, downloads[0].filename))
    await user.click(await screen.findByRole('button', { name: 'Replace everything' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Replace everything' }),
    )
    await waitFor(() => expect(second.router.state.location.pathname).toBe('/'))

    const sortById = (rows: Array<{ id: string }>) =>
      [...rows].sort((a, b) => a.id.localeCompare(b.id))
    const after = await repos.backup.exportAll()
    for (const table of Object.keys(before) as Array<keyof typeof before>) {
      expect(sortById(after[table])).toEqual(sortById(before[table]))
    }
  })
})

describe('finding it from Home', () => {
  it('links to backup and restore', async () => {
    renderApp('/')
    expect(await screen.findByRole('link', { name: /Back up & restore/ })).toHaveAttribute(
      'href',
      '/backup',
    )
  })
})
