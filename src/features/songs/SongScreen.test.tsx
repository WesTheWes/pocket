import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { repos } from '../../data'
import { createSeedData } from '../../data/seed'
import { renderApp } from '../../test/renderApp'

afterEach(async () => {
  localStorage.clear()
  await repos.backup.clear()
})

/** The Song screen opens on the path; these tests look at the sections list. */
async function showSections() {
  await userEvent.click(await screen.findByRole('button', { name: 'Sections' }))
}

async function loadSamples() {
  await repos.backup.replaceAll(createSeedData(Date.now()))
}

describe('SongScreen', () => {
  it('shows the song, its overall progress and its goal count', async () => {
    await loadSamples()
    renderApp('/songs/piano-man')
    expect(await screen.findByRole('heading', { name: 'Piano Man', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Billy Joel')).toBeInTheDocument()
    expect(screen.getByText('3 of 8 goals done')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Piano Man progress' })).toHaveAttribute(
      'aria-valuenow',
      '68',
    )
  })

  it('lists each section with its own goal count and progress', async () => {
    await loadSamples()
    renderApp('/songs/piano-man')
    await showSections()
    await screen.findByText('3 of 8 goals done')

    const sections = screen.getByRole('region', { name: 'Sections' })
    const rowFor = (name: string) => within(sections).getByText(name).closest('a')!

    expect(within(rowFor('Intro')).getByText('1 goal · 1 done')).toBeInTheDocument()
    expect(within(rowFor('Chorus')).getByText('2 goals · 0 done')).toBeInTheDocument()
    expect(within(rowFor('Chorus')).getByText('50%')).toBeInTheDocument()
    expect(within(rowFor('Bridge')).getByText('0%')).toBeInTheDocument()
    expect(within(rowFor('Outro')).getByText('100%')).toBeInTheDocument()
    expect(within(sections).getAllByRole('link', { name: /goal/ })).toHaveLength(5)
  })

  it('shows the play order, repeating sections where they repeat', async () => {
    await loadSamples()
    renderApp('/songs/piano-man')
    const order = await screen.findByRole('list', { name: 'Play order' })
    expect(
      within(order)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'])
  })

  it('shows the chord notes', async () => {
    await loadSamples()
    renderApp('/songs/piano-man')
    expect(await screen.findByText(/Intro\s+C G\/B Am Am\/G F C\/E Dm7 G7/)).toBeInTheDocument()
  })

  it('links to practice, goals, sections and editing', async () => {
    await loadSamples()
    renderApp('/songs/piano-man')
    await showSections()
    await screen.findByText('3 of 8 goals done')
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute(
      'href',
      '/practice/piano-man',
    )
    expect(screen.getByRole('link', { name: 'Goals' })).toHaveAttribute(
      'href',
      '/songs/piano-man/goals',
    )
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/songs/piano-man/sections/new',
    )
    expect(screen.getAllByRole('link', { name: 'Edit song' })[0]).toHaveAttribute(
      'href',
      '/songs/piano-man/edit',
    )
  })

  it('guides you when a song has no sections, structure or goals yet', async () => {
    await loadSamples()
    renderApp('/songs/rocket-man')
    await showSections()
    expect(await screen.findByText('No goals yet')).toBeInTheDocument()
    expect(screen.getByText(/Break the song into sections/)).toBeInTheDocument()
    expect(screen.getByText(/Set the order the sections are played/)).toBeInTheDocument()
    expect(screen.getByText('Add chords and notes')).toBeInTheDocument()
  })

  it('says so when the song does not exist', async () => {
    renderApp('/songs/nope')
    expect(await screen.findByText('Song not found')).toBeInTheDocument()
  })

  it('shows Page not found for an address that matches nothing', async () => {
    renderApp('/nowhere')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/')
  })

  it("practices a section from its first unfinished goal, or its first when it's all done", async () => {
    await loadSamples()
    renderApp('/songs/piano-man')
    await showSections()
    await screen.findByText('3 of 8 goals done')

    // Verse: the waltz pattern (g2) is done, so it starts at the first 4 bars (g3).
    expect(screen.getByRole('link', { name: 'Practice Verse' })).toHaveAttribute(
      'href',
      '/practice/piano-man?goal=piano-man-g3',
    )
    expect(screen.getByRole('link', { name: 'Practice Outro' })).toHaveAttribute(
      'href',
      '/practice/piano-man?goal=piano-man-g7',
    )
  })

  it('has no practice button for a section without goals', async () => {
    await loadSamples()
    const section = await repos.sections.create('piano-man', { name: 'Coda', notes: '' })
    renderApp('/songs/piano-man')
    await showSections()
    await screen.findByText(section.name)
    expect(screen.queryByRole('link', { name: 'Practice Coda' })).not.toBeInTheDocument()
  })
})

describe('links', () => {
  it('lists the song’s links, opening in a new tab', async () => {
    await loadSamples()
    renderApp('/songs/piano-man')
    const links = within(await screen.findByRole('list', { name: 'Song links' }))
    const link = links.getByRole('link', { name: /Piano Man \(official video\)/ })
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=gxEPV4kolz0')
    expect(link).toHaveAttribute('target', '_blank')
    expect(links.getByText('Video')).toBeInTheDocument()
  })

  it('invites you to add links when there are none', async () => {
    await loadSamples()
    renderApp('/songs/sir-duke')
    await screen.findByRole('heading', { name: 'Sir Duke', level: 1 })
    expect(screen.getByText(/Keep the recording/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Song links' })).not.toBeInTheDocument()
  })
})

describe('the path', () => {
  it('shows the goals as levels: done, where you are, open and locked', async () => {
    await loadSamples()
    renderApp('/songs/piano-man')
    const path = within(await screen.findByRole('region', { name: 'Path' }))
    expect(path.getByText('Level 1 of 2 · 3 of 8 goals done')).toBeInTheDocument()
    expect(path.getByRole('list', { name: 'Levels' }).children).toHaveLength(2)
    expect(path.getByRole('heading', { name: 'Level 1 · You are here' })).toBeInTheDocument()
    expect(path.getByRole('heading', { name: 'Level 2' })).toBeInTheDocument()
    // The current goal is expanded, with a start button.
    expect(
      path.getByRole('link', { name: 'Start First 4 bars with only bass and melody' }),
    ).toHaveAttribute('href', '/practice/piano-man?goal=piano-man-g3')
    expect(path.getByText('fastest Solid 64 of 84 BPM · 20 to go')).toBeInTheDocument()
    // Done, open and locked goals read as such.
    expect(path.getByRole('link', { name: /Harmonica line on right hand/ })).toHaveTextContent(
      'Intro',
    )
    expect(path.getByRole('link', { name: /Walk-up fill into bar 5/ })).toHaveTextContent('50%')
    expect(path.getByRole('link', { name: /stride piano/ })).toHaveTextContent(
      'Finish Full chorus with block chords first',
    )
    expect(screen.queryByRole('region', { name: 'Sections' })).not.toBeInTheDocument()
  })

  it('switches to the sections and remembers it', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { unmount } = renderApp('/songs/piano-man')
    await user.click(await screen.findByRole('button', { name: 'Sections' }))
    expect(screen.getByRole('region', { name: 'Sections' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Path' })).not.toBeInTheDocument()
    unmount()
    renderApp('/songs/piano-man')
    expect(await screen.findByRole('region', { name: 'Sections' })).toBeInTheDocument()
  })

  it('invites you to add goals when there are none', async () => {
    await loadSamples()
    renderApp('/songs/rocket-man')
    const path = within(await screen.findByRole('region', { name: 'Path' }))
    expect(path.getByText(/the path through the song appears here/)).toBeInTheDocument()
  })
})
