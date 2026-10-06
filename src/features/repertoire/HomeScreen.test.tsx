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
    expect(play).toHaveAttribute('href', '/practice/piano-man?goal=piano-man-g3')
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

describe('start here', () => {
  it('suggests one goal from the song practised last, with the reason and a tempo to start at', async () => {
    await loadSamples()
    renderApp('/')
    const card = within(await screen.findByRole('region', { name: 'Start here' }))
    expect(card.getByText('Piano Man · Verse')).toBeInTheDocument()
    expect(card.getByText('First 4 bars with only bass and melody')).toBeInTheDocument()
    expect(card.getByText('fastest Solid 64 of 84 BPM · 20 to go')).toBeInTheDocument()
    expect(card.getByText(/Last time you wrote: “Better once I slowed bar 3/)).toBeInTheDocument()
    expect(card.getByText(/Not Solid at 76\. Drop to 72/)).toBeInTheDocument()
    expect(card.getByRole('link', { name: 'Start at 72 BPM' })).toHaveAttribute(
      'href',
      '/practice/piano-man?goal=piano-man-g3',
    )
  })

  it('lands Practice on that tempo', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('link', { name: 'Start at 72 BPM' }))
    expect(await screen.findByRole('slider', { name: 'Tempo' })).toHaveValue('72')
  })

  it('shows nothing to start with no songs', async () => {
    renderApp('/')
    await screen.findByText('No songs yet')
    expect(screen.queryByRole('region', { name: 'Start here' })).not.toBeInTheDocument()
    expect(screen.queryByText('This week')).not.toBeInTheDocument()
  })
})

describe('this week', () => {
  it('marks today once you have practised, and counts the streak', async () => {
    await loadSamples()
    const session = await repos.sessions.startOrResume('piano-man')
    await repos.sessions.end(session.id)
    renderApp('/')
    const days = within(await screen.findByRole('list', { name: 'Days practised this week' }))
    expect(days.getAllByRole('listitem')).toHaveLength(7)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    expect(days.getByLabelText(`${today}, practised`)).toBeInTheDocument()
    expect(screen.getByText(/1 day · 1-day streak/)).toBeInTheDocument()
  })
})

describe('open, not started', () => {
  it('lists goals that just opened up and have never been tried', async () => {
    await loadSamples()
    // The waltz pattern is done, so a goal that needs it is open.
    const goal = await repos.goals.create({
      songId: 'piano-man',
      sectionId: 'piano-man-s1',
      title: 'Verse, hands together',
      targetBpm: 72,
      requires: ['piano-man-g2'],
    })
    renderApp('/')
    const open = within(await screen.findByRole('region', { name: 'Open, not started' }))
    expect(open.getByText('Verse, hands together')).toBeInTheDocument()
    expect(open.getByText('Piano Man · Verse · target 72')).toBeInTheDocument()
    expect(open.getByRole('link', { name: 'Start Verse, hands together' })).toHaveAttribute(
      'href',
      `/practice/piano-man?goal=${goal.id}`,
    )
    // The walk-up fill is open too, but has attempts, so it is not listed.
    expect(open.queryByText('Walk-up fill into bar 5')).not.toBeInTheDocument()
  })

  it('is absent when nothing is waiting', async () => {
    await loadSamples()
    renderApp('/')
    await screen.findByRole('region', { name: 'Start here' })
    expect(screen.queryByRole('region', { name: 'Open, not started' })).not.toBeInTheDocument()
  })
})
