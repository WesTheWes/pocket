import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { repos } from '../../data'
import { createSeedData } from '../../data/seed'
import { renderApp } from '../../test/renderApp'

afterEach(async () => {
  await repos.backup.clear()
})

async function loadSamples() {
  await repos.backup.replaceAll(createSeedData(Date.now()))
}

describe('New song', () => {
  it('shows the empty form', async () => {
    renderApp('/songs/new')
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Artist' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Chord notes' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Create song' })).toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'No tempo set' })).toBeChecked()
    expect(screen.getByRole('textbox', { name: 'Tempo, in BPM' })).toBeDisabled()
  })

  it('saves a tempo when you set one', async () => {
    const user = userEvent.setup()
    renderApp('/songs/new')
    await user.type(await screen.findByRole('textbox', { name: 'Title' }), 'Sir Duke')
    await user.click(screen.getByRole('checkbox', { name: 'No tempo set' }))
    const tempo = screen.getByRole('textbox', { name: 'Tempo, in BPM' })
    await user.clear(tempo)
    await user.type(tempo, '104')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Create song' }))

    await screen.findByRole('heading', { name: 'Sir Duke', level: 1 })
    const [song] = await repos.songs.list()
    expect(song.tempo).toBe(104)
  })

  it('asks for a title and saves nothing without one', async () => {
    const user = userEvent.setup()
    renderApp('/songs/new')
    await user.type(await screen.findByRole('textbox', { name: 'Artist' }), 'Nobody')
    await user.click(screen.getByRole('button', { name: 'Create song' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a title')
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAttribute('aria-invalid', 'true')
    expect(await repos.songs.list()).toEqual([])
  })

  it('treats a title of only spaces as empty', async () => {
    const user = userEvent.setup()
    renderApp('/songs/new')
    await user.type(await screen.findByRole('textbox', { name: 'Title' }), '   ')
    await user.click(screen.getByRole('button', { name: 'Create song' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a title')
    expect(await repos.songs.list()).toEqual([])
  })

  it('creates the song and opens it', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/songs/new')
    await user.type(await screen.findByRole('textbox', { name: 'Title' }), '  Blue in Green ')
    await user.type(screen.getByRole('textbox', { name: 'Artist' }), 'Miles Davis')
    await user.type(screen.getByRole('textbox', { name: 'Chord notes' }), 'Bbmaj7#11 A7alt')
    await user.click(screen.getByRole('button', { name: 'Create song' }))

    expect(
      await screen.findByRole('heading', { name: 'Blue in Green', level: 1 }),
    ).toBeInTheDocument()
    const [song] = await repos.songs.list()
    expect(song).toMatchObject({
      title: 'Blue in Green',
      artist: 'Miles Davis',
      chordNotes: 'Bbmaj7#11 A7alt',
      tempo: null,
      learnedOverride: false,
    })
    expect(router.state.location.pathname).toBe(`/songs/${song.id}`)
  })

  it('is reached from Home', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/')
    await screen.findByText('No songs yet')
    await user.click(screen.getAllByRole('link', { name: 'New song' })[0])
    expect(router.state.location.pathname).toBe('/songs/new')
  })
})

describe('Edit song', () => {
  it('is prefilled with the song', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/edit')
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Piano Man')
    expect(screen.getByRole('textbox', { name: 'Artist' })).toHaveValue('Billy Joel')
    expect(
      (screen.getByRole('textbox', { name: 'Chord notes' }) as HTMLTextAreaElement).value,
    ).toMatch(/^Intro\s+C G\/B/)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('saves changes and returns to the song', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/songs/piano-man/edit')
    const title = await screen.findByRole('textbox', { name: 'Title' })
    await user.clear(title)
    await user.type(title, 'Piano Man (live)')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByRole('heading', { name: 'Piano Man (live)', level: 1 }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/songs/piano-man')
    expect((await repos.songs.get('piano-man'))?.title).toBe('Piano Man (live)')
  })

  it('changes the tempo, and can clear it again', async () => {
    await loadSamples()
    await repos.songs.update('piano-man', { tempo: 90 })
    const user = userEvent.setup()
    renderApp('/songs/piano-man/edit')
    const tempo = await screen.findByRole('textbox', { name: 'Tempo, in BPM' })
    expect(tempo).toHaveValue('90')
    await user.click(screen.getByRole('button', { name: 'Increase tempo' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByRole('heading', { name: 'Piano Man', level: 1 })
    expect((await repos.songs.get('piano-man'))?.tempo).toBe(91)
  })

  it('refuses a blank title and leaves the song alone', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/edit')
    await user.clear(await screen.findByRole('textbox', { name: 'Title' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a title')
    expect((await repos.songs.get('piano-man'))?.title).toBe('Piano Man')
  })

  it('does not lose what you typed when other data changes underneath', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/edit')
    const artist = await screen.findByRole('textbox', { name: 'Artist' })
    await user.clear(artist)
    await user.type(artist, 'William Martin Joel')
    await repos.songs.update('piano-man', { chordNotes: 'changed elsewhere' })
    await waitFor(() => expect(artist).toHaveValue('William Martin Joel'))
  })

  it('can mark the song as learned by hand', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/edit')
    const learned = await screen.findByRole('switch', { name: /Mark as learned/ })
    expect(learned).not.toBeChecked()
    await user.click(learned)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByRole('heading', { name: 'Piano Man', level: 1 })
    expect((await repos.songs.get('piano-man'))?.learnedOverride).toBe(true)
  })

  it('says so when the song does not exist', async () => {
    renderApp('/songs/nope/edit')
    expect(await screen.findByText('Song not found')).toBeInTheDocument()
  })
})

describe('Deleting a song', () => {
  async function openConfirm() {
    await loadSamples()
    const user = userEvent.setup()
    const view = renderApp('/songs/piano-man/edit')
    await user.click(await screen.findByRole('button', { name: 'Delete song' }))
    const dialog = await screen.findByRole('dialog')
    return { user, dialog, ...view }
  }

  it('asks first, naming what will be removed', async () => {
    const { dialog } = await openConfirm()
    expect(within(dialog).getByRole('heading', { name: 'Delete “Piano Man”?' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent(
      'Its 5 sections, 8 goals and all progress history will be removed. This can’t be undone.',
    )
    expect(await repos.songs.get('piano-man')).toBeDefined()
  })

  it('does nothing when cancelled', async () => {
    const { user, dialog } = await openConfirm()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await repos.songs.get('piano-man')).toBeDefined()
    expect(await repos.goals.listBySong('piano-man')).toHaveLength(8)
  })

  it('closes with Escape without deleting', async () => {
    const { user } = await openConfirm()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await repos.songs.get('piano-man')).toBeDefined()
  })

  it('deletes the song and everything under it, then goes Home', async () => {
    const { user, dialog, router } = await openConfirm()
    await user.click(within(dialog).getByRole('button', { name: 'Delete song' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await repos.songs.get('piano-man')).toBeUndefined()
    expect(await repos.sections.listBySong('piano-man')).toEqual([])
    expect(await repos.goals.listBySong('piano-man')).toEqual([])
    expect(await repos.attempts.listBySong('piano-man')).toEqual([])
    expect(await repos.songs.list()).toHaveLength(4)
    expect(await screen.findByText('4 songs')).toBeInTheDocument()
    expect(screen.queryByText('Song not found')).not.toBeInTheDocument()
  })
})

describe('links', () => {
  it('adds a link to a song and refuses one without a web address', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/sir-duke/edit')
    await screen.findByRole('textbox', { name: 'Title' })
    await user.click(screen.getByRole('button', { name: 'Add link' }))
    await user.type(screen.getByRole('textbox', { name: 'Link 1 label' }), 'Horn line lesson')
    await user.type(screen.getByRole('textbox', { name: 'Link 1 address' }), 'not a url')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Link 1 kind' }), 'lesson')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/web address/)

    await user.clear(screen.getByRole('textbox', { name: 'Link 1 address' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Link 1 address' }),
      'https://example.com/horns',
    )
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByRole('heading', { name: 'Sir Duke', level: 1 })
    expect((await repos.songs.get('sir-duke'))?.resources).toEqual([
      { label: 'Horn line lesson', url: 'https://example.com/horns', kind: 'lesson' },
    ])
    expect(screen.getByRole('link', { name: /Horn line lesson/ })).toBeInTheDocument()
  })
})
