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

/** Song titles as they appear on the cards, top to bottom. */
function cardTitles() {
  return screen
    .getAllByRole('link', { name: /^Practice / })
    .map((link) => link.getAttribute('aria-label')!.replace('Practice ', ''))
}

describe('HomeScreen', () => {
  it('invites you to add a first song when there are none', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Pocket' })).toBeInTheDocument()
    expect(await screen.findByText('No songs yet')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'New song' }).length).toBeGreaterThan(0)
  })

  it('lists the sample songs, most recently practiced first', async () => {
    await loadSamples()
    renderApp('/')
    await screen.findByText('5 songs')
    expect(cardTitles()).toEqual([
      'Piano Man',
      "Don't Stop Believin'",
      'Autumn Leaves',
      'Sir Duke',
      'Rocket Man',
    ])
  })

  it('shows Piano Man at 68% and marks a finished song as Learned', async () => {
    await loadSamples()
    renderApp('/')
    const pianoMan = await screen.findByRole('progressbar', { name: 'Piano Man progress' })
    expect(pianoMan).toHaveAttribute('aria-valuenow', '68')
    const learnedCard = screen
      .getByRole('progressbar', { name: "Don't Stop Believin' progress" })
      .closest('a')!
    expect(within(learnedCard).getByText('Learned')).toBeInTheDocument()
    expect(within(pianoMan.closest('a')!).queryByText('Learned')).not.toBeInTheDocument()
  })

  it('sends the play button to the first goal that is not done', async () => {
    await loadSamples()
    renderApp('/')
    const play = await screen.findByRole('link', { name: 'Practice Piano Man' })
    expect(play).toHaveAttribute('href', '/practice/piano-man?goal=piano-man-g0')
  })

  it('filters by status', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByText('5 songs')

    await user.click(screen.getByRole('button', { name: 'Learned' }))
    expect(cardTitles()).toEqual(["Don't Stop Believin'"])
    expect(screen.getByText('1 song')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'In progress' }))
    expect(cardTitles()).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'In progress' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('searches by title or artist', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByText('5 songs')

    await user.type(screen.getByRole('searchbox', { name: 'Search songs' }), 'stevie')
    expect(cardTitles()).toEqual(['Sir Duke'])
  })

  it('offers a way out when nothing matches', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByText('5 songs')

    await user.type(screen.getByRole('searchbox', { name: 'Search songs' }), 'zzzz')
    expect(screen.getByText('No songs match')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search and filter' }))
    expect(cardTitles()).toHaveLength(5)
  })

  it('re-sorts by title', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByText('5 songs')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort songs' }), 'title')
    expect(cardTitles()).toEqual([
      'Autumn Leaves',
      "Don't Stop Believin'",
      'Piano Man',
      'Rocket Man',
      'Sir Duke',
    ])
  })

  it('opens a song when its card is tapped', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/')
    await screen.findByText('5 songs')

    const card = screen.getByRole('progressbar', { name: 'Piano Man progress' }).closest('a')!
    expect(within(card).getByText('Piano Man')).toBeInTheDocument()
    await user.click(card)
    expect(router.state.location.pathname).toBe('/songs/piano-man')
  })

  it('updates by itself when a song is added elsewhere', async () => {
    renderApp('/')
    await screen.findByText('No songs yet')
    await repos.songs.create({ title: 'Blue in Green', artist: 'Miles Davis' })
    expect(await screen.findByText('Blue in Green')).toBeInTheDocument()
    expect(screen.queryByText('No songs yet')).not.toBeInTheDocument()
  })
})
