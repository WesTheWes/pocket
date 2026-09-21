import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { repos } from '../../data'
import { createSeedData } from '../../data/seed'
import { FakeAudioContext, installFakeAudio } from '../../test/fakeAudio'
import { renderApp } from '../../test/renderApp'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

beforeEach(() => {
  installFakeAudio()
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await repos.backup.clear()
})

async function loadSamples() {
  await repos.backup.replaceAll(createSeedData(Date.now()))
}

const goalTitle = () => screen.getByRole('heading', { level: 1 }).textContent
const tempo = () => screen.getByRole('slider', { name: 'Tempo' })
const openSessions = async (songId: string) =>
  (await repos.sessions.listBySong(songId)).filter((s) => s.endedAt === null)

describe('starting a session', () => {
  it('starts one for the song on arrival', async () => {
    await loadSamples()
    renderApp('/practice/piano-man')
    expect(await screen.findByRole('timer', { name: 'Practice time' })).toHaveTextContent(
      /^00:0\d$/,
    )
    await waitFor(async () => expect(await openSessions('piano-man')).toHaveLength(1))
    expect(screen.getByRole('button', { name: 'Change song' })).toHaveTextContent('Piano Man')
    expect(screen.getByRole('button', { name: 'Change song' })).toHaveTextContent('Billy Joel')
  })

  it('starts exactly one session even when React runs effects twice', async () => {
    await loadSamples()
    const router = createMemoryRouter(routes, { initialEntries: ['/practice/piano-man'] })
    render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )
    await screen.findByRole('timer', { name: 'Practice time' })
    await waitFor(async () => expect(await repos.sessions.listBySong('piano-man')).toHaveLength(2))
    // Two: the sample data's finished one, plus a single new one.
    expect(await openSessions('piano-man')).toHaveLength(1)
  })

  it('resumes the open session and shows the time it has really run for', async () => {
    await loadSamples()
    const data = await repos.backup.exportAll()
    await repos.backup.replaceAll({
      ...data,
      sessions: [
        ...data.sessions,
        {
          id: 'open',
          songId: 'piano-man',
          startedAt: Date.now() - 5 * MINUTE,
          pausedMs: 0,
          pausedAt: null,
          endedAt: null,
        },
      ],
    })
    renderApp('/practice/piano-man')
    // Derived from the stored start, not from when this screen mounted (the clock ticks in
    // quarter-seconds, so allow it to read a hair under 5:00).
    expect(await screen.findByRole('timer', { name: 'Practice time' })).toHaveTextContent(
      /^(04:59|05:0\d)$/,
    )
    expect((await openSessions('piano-man')).map((s) => s.id)).toEqual(['open'])
  })

  it('does not resume a session that was abandoned long ago', async () => {
    await loadSamples()
    const data = await repos.backup.exportAll()
    await repos.backup.replaceAll({
      ...data,
      sessions: [
        ...data.sessions,
        {
          id: 'stale',
          songId: 'piano-man',
          startedAt: Date.now() - 30 * HOUR,
          pausedMs: 0,
          pausedAt: null,
          endedAt: null,
        },
      ],
    })
    renderApp('/practice/piano-man')
    expect(await screen.findByRole('timer', { name: 'Practice time' })).toHaveTextContent(
      /^00:0\d$/,
    )
    const open = await openSessions('piano-man')
    expect(open).toHaveLength(1)
    expect(open[0].id).not.toBe('stale')
    expect((await repos.sessions.get('stale'))?.endedAt).not.toBeNull()
  })

  it('says so when the song does not exist', async () => {
    renderApp('/practice/nope')
    expect(await screen.findByText('Song not found')).toBeInTheDocument()
  })
})

describe('the timer', () => {
  it('pauses and resumes, and stores it', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man')
    await user.click(await screen.findByRole('button', { name: 'Pause timer' }))
    expect(await screen.findByRole('button', { name: 'Resume timer' })).toBeInTheDocument()
    expect((await openSessions('piano-man'))[0].pausedAt).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Resume timer' }))
    expect(await screen.findByRole('button', { name: 'Pause timer' })).toBeInTheDocument()
    expect((await openSessions('piano-man'))[0].pausedAt).toBeNull()
  })
})

describe('choosing the goal', () => {
  it('starts at the first goal that is not done', async () => {
    await loadSamples()
    renderApp('/practice/piano-man')
    await screen.findByRole('timer', { name: 'Practice time' })
    expect(goalTitle()).toBe('Play start to finish without stopping')
    expect(screen.getByText('Whole song · Goal 1 of 8')).toBeInTheDocument()
    expect(screen.getByText('fastest Solid 56 of 84 BPM')).toBeInTheDocument()
  })

  it('opens the goal named in the address, so a reload keeps your place', async () => {
    await loadSamples()
    renderApp('/practice/piano-man?goal=piano-man-g4')
    await screen.findByRole('timer', { name: 'Practice time' })
    expect(goalTitle()).toBe('Full chorus with block chords')
    expect(screen.getByText('Chorus · Goal 5 of 8')).toBeInTheDocument()
  })

  it('moves with Prev goal and Next goal, and stops at both ends', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const view = renderApp('/practice/piano-man')
    const { router } = view
    await screen.findByRole('timer', { name: 'Practice time' })
    expect(screen.getByRole('button', { name: 'Prev goal' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next goal' }))
    expect(goalTitle()).toBe('Harmonica line on right hand')
    expect(router.state.location.search).toBe('?goal=piano-man-g1')
    await user.click(screen.getByRole('button', { name: 'Prev goal' }))
    expect(goalTitle()).toBe('Play start to finish without stopping')

    // A separate render, at the last goal.
    view.unmount()
    renderApp('/practice/piano-man?goal=piano-man-g7')
    expect(await screen.findByRole('button', { name: 'Next goal' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Prev goal' })).toBeEnabled()
  })

  it('jumps to a section’s first goal from its chip, showing that section’s progress', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man')
    const sections = await screen.findByRole('group', { name: 'Sections' })
    expect(
      within(sections)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual([
      'Whole song, 67% complete',
      'Intro, 100% complete',
      'Verse, 88% complete',
      'Chorus, 50% complete',
      'Bridge, 0% complete',
      'Outro, 100% complete',
    ])
    expect(within(sections).getByRole('button', { name: /^Whole song/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(within(sections).getByRole('button', { name: /^Verse/ }))
    expect(goalTitle()).toBe('Left hand waltz pattern')
    expect(within(sections).getByRole('button', { name: /^Verse/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(sections).getByRole('button', { name: /^Whole song/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('lists every goal in the side panel, marking the current one', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man')
    const list = await screen.findByRole('navigation', { name: 'Goals' })
    const buttons = within(list).getAllByRole('button')
    expect(buttons).toHaveLength(8)
    expect(buttons[0]).toHaveAttribute('aria-current', 'true')

    await user.click(within(list).getByRole('button', { name: /Walk-up fill into bar 5/ }))
    expect(goalTitle()).toBe('Walk-up fill into bar 5')
    expect(within(list).getByRole('button', { name: /Walk-up fill/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('links to logging an attempt for the current goal', async () => {
    await loadSamples()
    renderApp('/practice/piano-man?goal=piano-man-g3')
    expect(await screen.findByRole('link', { name: 'Log attempt' })).toHaveAttribute(
      'href',
      '/songs/piano-man/goals/piano-man-g3',
    )
  })

  it('offers free practice when a song has no goals', async () => {
    await loadSamples()
    renderApp('/practice/rocket-man')
    expect(await screen.findByRole('heading', { name: 'Free practice' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a goal' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next goal' })).not.toBeInTheDocument()
    expect(tempo()).toHaveAttribute('aria-valuetext', '80 BPM')
  })
})

describe('the metronome tempo', () => {
  it('starts at the last tempo you logged for the goal', async () => {
    await loadSamples()
    renderApp('/practice/piano-man?goal=piano-man-g3')
    await screen.findByRole('timer', { name: 'Practice time' })
    expect(tempo()).toHaveAttribute('aria-valuetext', '76 BPM')
  })

  it('starts at the target when nothing has been logged yet', async () => {
    await loadSamples()
    const goal = await repos.goals.create({
      songId: 'rocket-man',
      title: 'Play it',
      targetBpm: 100,
    })
    renderApp(`/practice/rocket-man?goal=${goal.id}`)
    await screen.findByRole('timer', { name: 'Practice time' })
    expect(tempo()).toHaveAttribute('aria-valuetext', '100 BPM')
  })

  it('starts each goal at its own tempo, and remembers what you set on it', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man')
    await screen.findByRole('timer', { name: 'Practice time' })
    expect(tempo()).toHaveAttribute('aria-valuetext', '70 BPM') // last logged on the whole-song goal
    await user.click(screen.getByRole('button', { name: 'Faster' }))
    expect(tempo()).toHaveAttribute('aria-valuetext', '71 BPM')

    await user.click(screen.getByRole('button', { name: 'Next goal' }))
    expect(tempo()).toHaveAttribute('aria-valuetext', '76 BPM') // Intro goal: last logged 76
    await user.click(screen.getByRole('button', { name: 'Prev goal' }))
    expect(tempo()).toHaveAttribute('aria-valuetext', '71 BPM') // back to what you set, not 70
  })

  it('changes by one with Slower and Faster, and by the slider', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man?goal=piano-man-g3')
    await screen.findByRole('timer', { name: 'Practice time' })
    await user.click(screen.getByRole('button', { name: 'Slower' }))
    await user.click(screen.getByRole('button', { name: 'Slower' }))
    expect(tempo()).toHaveAttribute('aria-valuetext', '74 BPM')
    fireEvent.change(tempo(), { target: { value: '120' } })
    expect(tempo()).toHaveAttribute('aria-valuetext', '120 BPM')
  })

  it('stops the buttons at 30 and 240', async () => {
    await loadSamples()
    const goal = await repos.goals.create({ songId: 'rocket-man', title: 'Slow', targetBpm: 30 })
    renderApp(`/practice/rocket-man?goal=${goal.id}`)
    await screen.findByRole('timer', { name: 'Practice time' })
    expect(screen.getByRole('button', { name: 'Slower' })).toBeDisabled()
  })
})

describe('the metronome', () => {
  it('plays and stops from the button, using the audio clock', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man')
    const play = await screen.findByRole('button', { name: 'Start metronome' })
    expect(FakeAudioContext.instances).toHaveLength(0)

    await user.click(play)
    expect(screen.getByRole('button', { name: 'Stop metronome' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].resumed).toBe(1)
    expect(FakeAudioContext.instances[0].oscillators).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Stop metronome' }))
    expect(screen.getByRole('button', { name: 'Start metronome' })).toBeInTheDocument()
  })

  it('keeps playing when you move to the next goal', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man')
    await user.click(await screen.findByRole('button', { name: 'Start metronome' }))
    await user.click(screen.getByRole('button', { name: 'Next goal' }))
    expect(screen.getByRole('button', { name: 'Stop metronome' })).toBeInTheDocument()
  })

  it('releases the audio when you leave the screen', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { unmount } = renderApp('/practice/piano-man')
    await user.click(await screen.findByRole('button', { name: 'Start metronome' }))
    unmount()
    expect(FakeAudioContext.instances[0].closed).toBe(1)
  })

  it('says so when the browser has no audio', async () => {
    await loadSamples()
    vi.stubGlobal('AudioContext', undefined)
    const user = userEvent.setup()
    renderApp('/practice/piano-man')
    await user.click(await screen.findByRole('button', { name: 'Start metronome' }))
    expect(await screen.findByText('Sound isn’t available in this browser.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start metronome' })).toBeInTheDocument()
  })
})

describe('finishing and switching', () => {
  it('finishing ends the session and opens the review', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man')
    await screen.findByRole('timer', { name: 'Practice time' })
    const [session] = await openSessions('piano-man')
    await user.click(screen.getByRole('button', { name: 'Finish practice' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/practice/piano-man/review/${session.id}`),
    )
    expect((await repos.sessions.get(session.id))?.endedAt).not.toBeNull()
    expect(await openSessions('piano-man')).toEqual([])
  })

  it('offers every song, marking the current one', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man')
    await user.click(await screen.findByRole('button', { name: 'Change song' }))
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Practice a different song' }),
    ).toBeInTheDocument()
    expect(within(dialog).getAllByRole('button')).toHaveLength(5)
    expect(within(dialog).getByRole('button', { name: /Piano Man/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('picking the current song just closes the list', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man')
    await user.click(await screen.findByRole('button', { name: 'Change song' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /Piano Man/ }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/practice/piano-man')
    expect(await openSessions('piano-man')).toHaveLength(1)
  })

  it('switching songs ends this session and starts one for the other song', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man')
    await screen.findByRole('timer', { name: 'Practice time' })
    const [first] = await openSessions('piano-man')

    await user.click(screen.getByRole('button', { name: 'Change song' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /Sir Duke/ }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/practice/sir-duke'))
    expect(await screen.findByRole('button', { name: 'Change song' })).toHaveTextContent('Sir Duke')
    expect((await repos.sessions.get(first.id))?.endedAt).not.toBeNull()
    await waitFor(async () => expect(await openSessions('sir-duke')).toHaveLength(1))
    expect(await openSessions('piano-man')).toEqual([])
  })
})

describe('seeing the current section’s goals without paging', () => {
  const sectionList = (name: string) => screen.findByRole('navigation', { name })

  it('lists every goal in the current section, marking the one you are on', async () => {
    await loadSamples()
    renderApp('/practice/piano-man?goal=piano-man-g4')
    const list = await sectionList('Goals in Chorus')
    const rows = within(list).getAllByRole('button')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Full chorus with block chords')
    expect(rows[1]).toHaveTextContent('Walk-up fill into bar 5')
    expect(rows[0]).toHaveAttribute('aria-current', 'true')
    expect(rows[1]).not.toHaveAttribute('aria-current')
  })

  it('jumps straight to a goal when you tap it', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man?goal=piano-man-g4')
    const list = await sectionList('Goals in Chorus')
    await user.click(within(list).getByRole('button', { name: /Walk-up fill into bar 5/ }))

    expect(goalTitle()).toBe('Walk-up fill into bar 5')
    expect(router.state.location.search).toBe('?goal=piano-man-g5')
    expect(within(list).getByRole('button', { name: /Walk-up fill/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('shows each goal’s progress, and Done for finished ones', async () => {
    await loadSamples()
    renderApp('/practice/piano-man?goal=piano-man-g3')
    const list = await sectionList('Goals in Verse')
    const done = within(list).getByRole('button', { name: /Left hand waltz pattern/ })
    expect(done).toHaveTextContent('Done')
    const notDone = within(list).getByRole('button', { name: /First 4 bars/ })
    expect(notDone).toHaveTextContent('76%')
    expect(notDone).not.toHaveTextContent('Done')
  })

  it('is not shown for a section with just one goal', async () => {
    await loadSamples()
    renderApp('/practice/piano-man?goal=piano-man-g1') // Intro has a single goal
    await screen.findByRole('timer', { name: 'Practice time' })
    expect(screen.queryByRole('navigation', { name: /^Goals in/ })).not.toBeInTheDocument()
  })

  it('changes with the section as you move between goals', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man?goal=piano-man-g1')
    await screen.findByRole('timer', { name: 'Practice time' })
    expect(screen.queryByRole('navigation', { name: /^Goals in/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next goal' }))
    expect(await sectionList('Goals in Verse')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next goal' }))
    await user.click(screen.getByRole('button', { name: 'Next goal' }))
    expect(await sectionList('Goals in Chorus')).toBeInTheDocument()
  })

  it('still has the full list of every goal for the desktop side panel', async () => {
    await loadSamples()
    renderApp('/practice/piano-man?goal=piano-man-g4')
    const all = await screen.findByRole('navigation', { name: 'Goals' })
    expect(within(all).getAllByRole('button')).toHaveLength(8)
  })
})

describe('adding and editing goals during a session', () => {
  const dialog = () => screen.findByRole('dialog')
  const titleBox = () => screen.findByRole('textbox', { name: 'Title' })
  const targetTempo = () => screen.getByRole('textbox', { name: 'Target tempo, in BPM' })

  describe('editing the current goal', () => {
    it('opens the goal in a sheet without leaving practice', async () => {
      await loadSamples()
      const user = userEvent.setup()
      const { router } = renderApp('/practice/piano-man?goal=piano-man-g3')
      await user.click(await screen.findByRole('button', { name: 'Edit goal' }))

      const sheet = await dialog()
      expect(within(sheet).getByRole('heading', { name: 'Edit goal' })).toBeInTheDocument()
      expect(await titleBox()).toHaveValue('First 4 bars with only bass and melody')
      expect(targetTempo()).toHaveValue('84')
      expect(within(sheet).getByRole('button', { name: 'Verse' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(router.state.location.pathname).toBe('/practice/piano-man')
    })

    it('saves the changes and shows them at once', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g3')
      await user.click(await screen.findByRole('button', { name: 'Edit goal' }))
      const title = await titleBox()
      await user.clear(title)
      await user.type(title, 'Melody and bass, first 4 bars')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(goalTitle()).toBe('Melody and bass, first 4 bars')
      expect((await repos.goals.get('piano-man-g3'))?.title).toBe('Melody and bass, first 4 bars')
      // Still the same goal, in the same place.
      expect(screen.getByText('Verse · Goal 4 of 8')).toBeInTheDocument()
    })

    it('recalculates progress when you change the target tempo', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g3')
      expect(await screen.findByText('fastest Solid 64 of 84 BPM')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      await titleBox()
      await user.clear(targetTempo())
      await user.type(targetTempo(), '64')
      await user.tab()
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByText('fastest Solid 64 of 64 BPM')).toBeInTheDocument()
      const list = screen.getByRole('navigation', { name: 'Goals in Verse' })
      expect(within(list).getByRole('button', { name: /First 4 bars/ })).toHaveTextContent('Done')
    })

    it('keeps the sheet open and says what is wrong when the title is blank', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g3')
      await user.click(await screen.findByRole('button', { name: 'Edit goal' }))
      await user.clear(await titleBox())
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Enter a title')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect((await repos.goals.get('piano-man-g3'))?.title).toBe(
        'First 4 bars with only bass and melody',
      )
    })

    it('leaves everything alone when cancelled or closed with Escape', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g3')
      await user.click(await screen.findByRole('button', { name: 'Edit goal' }))
      await user.type(await titleBox(), ' EXTRA')
      await user.click(within(await dialog()).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(goalTitle()).toBe('First 4 bars with only bass and melody')

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      await titleBox()
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect((await repos.goals.get('piano-man-g3'))?.title).toBe(
        'First 4 bars with only bass and melody',
      )
    })

    it('starts each edit fresh, showing that goal’s own values', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g3')
      await user.click(await screen.findByRole('button', { name: 'Edit goal' }))
      await user.type(await titleBox(), ' typed but cancelled')
      await user.click(within(await dialog()).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Next goal' }))
      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      expect(await titleBox()).toHaveValue('Full chorus with block chords')
    })
  })

  describe('adding a goal', () => {
    it('opens a sheet with the current section chosen', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g4')
      await user.click(await screen.findByRole('button', { name: 'Add goal' }))
      const sheet = await dialog()
      expect(within(sheet).getByRole('heading', { name: 'Add goal' })).toBeInTheDocument()
      expect(await titleBox()).toHaveValue('')
      expect(within(sheet).getByRole('button', { name: 'Chorus' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('creates the goal and moves straight to it', async () => {
      await loadSamples()
      const user = userEvent.setup()
      const { router } = renderApp('/practice/piano-man?goal=piano-man-g4')
      await user.click(await screen.findByRole('button', { name: 'Add goal' }))
      await user.type(await titleBox(), 'Hands together, slowly')
      await user.click(within(await dialog()).getByRole('button', { name: 'Add goal' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(
        await screen.findByRole('heading', { name: 'Hands together, slowly', level: 1 }),
      ).toBeInTheDocument()
      expect(screen.getByText('Chorus · Goal 7 of 9')).toBeInTheDocument()
      const created = (await repos.goals.listBySong('piano-man')).find(
        (g) => g.title === 'Hands together, slowly',
      )
      expect(created).toMatchObject({ sectionId: 'piano-man-s2', targetBpm: 80 })
      await waitFor(() => expect(router.state.location.search).toBe(`?goal=${created!.id}`))
      // It appears in the section's list too, so all three Chorus goals are visible.
      const list = screen.getByRole('navigation', { name: 'Goals in Chorus' })
      expect(within(list).getAllByRole('button')).toHaveLength(3)
    })

    it('can add a whole-song goal instead', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g4')
      await user.click(await screen.findByRole('button', { name: 'Add goal' }))
      const sheet = await dialog()
      await user.click(within(sheet).getByRole('button', { name: 'Whole song' }))
      await user.type(await titleBox(), 'Play it for a friend')
      await user.click(within(sheet).getByRole('button', { name: 'Add goal' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await screen.findByText('Whole song · Goal 2 of 9')).toBeInTheDocument()
      const created = (await repos.goals.listBySong('piano-man')).find(
        (g) => g.title === 'Play it for a friend',
      )
      expect(created?.sectionId).toBeNull()
    })

    it('starts the metronome at the new goal’s target tempo', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g4')
      await user.click(await screen.findByRole('button', { name: 'Add goal' }))
      await user.type(await titleBox(), 'Quick one')
      await user.clear(targetTempo())
      await user.type(targetTempo(), '132')
      await user.tab()
      await user.click(within(await dialog()).getByRole('button', { name: 'Add goal' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(tempo()).toHaveAttribute('aria-valuetext', '132 BPM'))
    })

    it('asks for a title and adds nothing without one', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g4')
      await user.click(await screen.findByRole('button', { name: 'Add goal' }))
      await user.click(within(await dialog()).getByRole('button', { name: 'Add goal' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Enter a title')
      expect(await repos.goals.listBySong('piano-man')).toHaveLength(8)
    })

    it('adds nothing when cancelled', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g4')
      await user.click(await screen.findByRole('button', { name: 'Add goal' }))
      await user.type(await titleBox(), 'Never mind')
      await user.click(within(await dialog()).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await repos.goals.listBySong('piano-man')).toHaveLength(8)
    })

    it('turns free practice into a real goal', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/rocket-man')
      await user.click(await screen.findByRole('button', { name: 'Add a goal' }))
      await user.type(await titleBox(), 'Learn the intro')
      await user.click(within(await dialog()).getByRole('button', { name: 'Add goal' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(
        await screen.findByRole('heading', { name: 'Learn the intro', level: 1 }),
      ).toBeInTheDocument()
      expect(screen.getByText('Whole song · Goal 1 of 1')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Free practice' })).not.toBeInTheDocument()
    })
  })

  describe('while practicing', () => {
    it('keeps the metronome playing and the session running', async () => {
      await loadSamples()
      const user = userEvent.setup()
      renderApp('/practice/piano-man?goal=piano-man-g4')
      await user.click(await screen.findByRole('button', { name: 'Start metronome' }))
      const [session] = await openSessions('piano-man')

      await user.click(screen.getByRole('button', { name: 'Edit goal' }))
      await user.type(await titleBox(), '!')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Add goal' }))
      await user.type(await titleBox(), 'Another')
      await user.click(within(await dialog()).getByRole('button', { name: 'Add goal' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      expect(screen.getByRole('button', { name: 'Stop metronome' })).toBeInTheDocument()
      expect(FakeAudioContext.instances).toHaveLength(1)
      expect(FakeAudioContext.instances[0].closed).toBe(0)
      expect((await openSessions('piano-man')).map((s) => s.id)).toEqual([session.id])
    })
  })
})
