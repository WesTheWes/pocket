import { screen, within } from '@testing-library/react'
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
    await screen.findByText(section.name)
    expect(screen.queryByRole('link', { name: 'Practice Coda' })).not.toBeInTheDocument()
  })
})
