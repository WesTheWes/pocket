import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { repos } from '../../data'
import { createSeedData } from '../../data/seed'
import { doneCount } from '../../domain/progress'
import { renderApp } from '../../test/renderApp'

afterEach(async () => {
  await repos.backup.clear()
})

const DAY = 24 * 60 * 60 * 1000

async function loadSamples(now = Date.now()) {
  const data = createSeedData(now)
  await repos.backup.replaceAll(data)
  return data
}

const figure = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling

describe('StatsScreen', () => {
  it('shows songs, goals done and practice time this week', async () => {
    const data = await loadSamples()
    renderApp('/stats')
    expect(await screen.findByRole('heading', { name: 'Stats' })).toBeInTheDocument()
    expect(figure('Songs')).toHaveTextContent(String(data.songs.length))
    expect(figure('Goals done')).toHaveTextContent(String(doneCount(data.goals, data.attempts)))
    // The sample session: 24 minutes of practice, two days ago.
    expect(figure('This week')).toHaveTextContent('24:00')
  })

  it('leaves practice older than a week out of "This week"', async () => {
    await loadSamples(Date.now() - 6 * DAY)
    renderApp('/stats')
    await screen.findByRole('heading', { name: 'Stats' })
    expect(figure('This week')).toHaveTextContent('0:00')
  })

  it('lists goals that improved in recent sessions, with when', async () => {
    await loadSamples()
    renderApp('/stats')
    const list = await screen.findByRole('list', { name: 'Goals improved lately' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(within(rows[0]).getByText('Piano Man · Chorus')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Walk-up fill into bar 5')).toBeInTheDocument()
    expect(within(rows[0]).getByText('from 0% to 50%')).toBeInTheDocument()
    expect(within(rows[0]).getByText('2 days ago')).toBeInTheDocument()
  })

  it('says so when nothing improved lately', async () => {
    await loadSamples(Date.now() - 40 * DAY)
    renderApp('/stats')
    expect(await screen.findByText(/Nothing yet in the last 30 days/)).toBeInTheDocument()
  })

  it('lists every song with its progress and status, linking to the song', async () => {
    await loadSamples()
    renderApp('/stats')
    const region = await screen.findByRole('region', { name: 'Your songs' })
    const piano = within(region).getByRole('link', { name: /Piano Man/ })
    expect(piano).toHaveAttribute('href', '/songs/piano-man')
    expect(piano).toHaveTextContent('68%')
    expect(piano).toHaveTextContent('In progress')
    expect(within(region).getByText('5 songs')).toBeInTheDocument()
  })

  it('marks a song with no attempts as Not started', async () => {
    await loadSamples()
    await repos.songs.create({ title: 'Fly Me to the Moon', artist: '', chordNotes: '' })
    renderApp('/stats')
    const region = await screen.findByRole('region', { name: 'Your songs' })
    expect(within(region).getByRole('link', { name: /Fly Me to the Moon/ })).toHaveTextContent(
      '0%Not started',
    )
  })

  it('is reachable from Home', async () => {
    await loadSamples()
    renderApp('/')
    const links = await screen.findAllByRole('link', { name: 'Stats' })
    expect(links).toHaveLength(2)
    await userEvent.click(links[0])
    expect(await screen.findByText('Your practice, at a glance')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/')
  })
})
