import { screen, within } from '@testing-library/react'
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

describe('GoalsScreen', () => {
  it('shows the song and counts goals for each filter', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals')
    expect(await screen.findByRole('heading', { name: 'Piano Man', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Goals across the whole song and each section')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All 8' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'To do 5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done 3' })).toBeInTheDocument()
  })

  it('groups goals under the whole song and each section, with counts', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals')
    await screen.findByRole('heading', { name: 'Piano Man', level: 1 })
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Whole song', 'Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'])

    const verse = screen.getByRole('region', { name: 'Verse' })
    expect(within(verse).getByText('Left hand waltz pattern')).toBeInTheDocument()
    expect(within(verse).getByText('First 4 bars with only bass and melody')).toBeInTheDocument()
    expect(within(verse).getByText('2')).toBeInTheDocument()
  })

  it('shows progress on each card, and Done only on finished goals', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals')
    const chorus = await screen.findByRole('region', { name: 'Chorus' })
    expect(within(chorus).getByText('fastest Solid 45 of 90 BPM')).toBeInTheDocument()
    expect(within(chorus).queryByText('Done')).not.toBeInTheDocument()

    const bridge = screen.getByRole('region', { name: 'Bridge' })
    expect(within(bridge).getByText('No Solid attempt yet')).toBeInTheDocument()

    const outro = screen.getByRole('region', { name: 'Outro' })
    expect(within(outro).getByText('Done')).toBeInTheDocument()
    expect(screen.getAllByText('Done')).toHaveLength(3)
  })

  it('never shows a bare quality rating on a goal card', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals')
    await screen.findByRole('heading', { name: 'Piano Man', level: 1 })
    for (const label of ["Can't play at all", 'Many mistakes', 'Few mistakes', 'Perfection']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it('opens a goal from its card', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/songs/piano-man/goals')
    const card = (await screen.findByText('Land the ending fill')).closest('a')!
    await user.click(card)
    expect(router.state.location.pathname).toBe('/songs/piano-man/goals/piano-man-g7')
  })

  it('adds a goal to the group whose plus you tap', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals')
    expect(await screen.findByRole('link', { name: 'Add goal to Whole song' })).toHaveAttribute(
      'href',
      '/songs/piano-man/goals/new',
    )
    expect(screen.getByRole('link', { name: 'Add goal to Verse' })).toHaveAttribute(
      'href',
      '/songs/piano-man/goals/new?section=piano-man-s1',
    )
  })

  it('filters to what is left to do, hiding groups with nothing to do', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/goals')
    await user.click(await screen.findByRole('button', { name: 'To do 5' }))
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    // Intro and Outro are done, so their groups disappear.
    expect(headings).toEqual(['Whole song', 'Verse', 'Chorus', 'Bridge'])
    expect(screen.queryByText('Harmonica line on right hand')).not.toBeInTheDocument()
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
  })

  it('filters to what is done', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/goals')
    await user.click(await screen.findByRole('button', { name: 'Done 3' }))
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Intro', 'Verse', 'Outro'])
    expect(screen.getByText('Left hand waltz pattern')).toBeInTheDocument()
    expect(screen.queryByText('First 4 bars with only bass and melody')).not.toBeInTheDocument()
  })

  it('invites you to add a first goal when the song has none', async () => {
    await loadSamples()
    renderApp('/songs/rocket-man/goals')
    expect(await screen.findByText(/No goals yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add a goal' })).toHaveAttribute(
      'href',
      '/songs/rocket-man/goals/new',
    )
    expect(screen.queryByRole('button', { name: /^All/ })).not.toBeInTheDocument()
  })

  it('says so when the song does not exist', async () => {
    renderApp('/songs/nope/goals')
    expect(await screen.findByText('Song not found')).toBeInTheDocument()
  })

  it('updates by itself when a goal is added elsewhere', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals')
    await screen.findByRole('button', { name: 'All 8' })
    await repos.goals.create({ songId: 'piano-man', title: 'Play it from memory', targetBpm: 90 })
    expect(await screen.findByRole('button', { name: 'All 9' })).toBeInTheDocument()
    expect(screen.getByText('Play it from memory')).toBeInTheDocument()
  })

  it('starts practice at a goal from its card', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals')
    await userEvent.click(
      await screen.findByRole('link', { name: 'Practice Walk-up fill into bar 5' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Walk-up fill into bar 5' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Chorus').length).toBeGreaterThan(0)
  })
})

describe('locked goals', () => {
  it('says which goal to finish first, only while that goal is not done', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals')
    const bridge = await screen.findByRole('region', { name: 'Bridge' })
    expect(
      within(bridge).getByText('Finish Full chorus with block chords first'),
    ).toBeInTheDocument()
    // Walk-up fill requires the waltz pattern, which is done, so it is not locked.
    const chorus = screen.getByRole('region', { name: 'Chorus' })
    expect(within(chorus).queryByText(/^Finish /)).not.toBeInTheDocument()
  })
})
