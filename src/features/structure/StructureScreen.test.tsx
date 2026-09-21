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

/** "Intro", "Verse", ... in play order, read from the reorder handles. */
function order() {
  return screen
    .getAllByRole('button', { name: /^Reorder / })
    .map((b) => b.getAttribute('aria-label')!.replace(/^Reorder (.*), position \d+$/, '$1'))
}

describe('StructureScreen', () => {
  it('shows the song’s current play order, repeats included', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/structure')
    await screen.findByRole('list', { name: 'Play order' })
    expect(order()).toEqual([
      'Intro',
      'Verse',
      'Chorus',
      'Verse',
      'Chorus',
      'Bridge',
      'Chorus',
      'Outro',
    ])
  })

  it('numbers each slot and gives every control a descriptive name', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/structure')
    const list = await screen.findByRole('list', { name: 'Play order' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(8)
    expect(within(items[1]).getByText('2')).toBeInTheDocument()
    expect(
      within(items[1]).getByRole('button', { name: 'Reorder Verse, position 2' }),
    ).toBeInTheDocument()
    expect(
      within(items[1]).getByRole('button', { name: 'Remove Verse from position 2' }),
    ).toBeInTheDocument()
  })

  it('offers one add button per section', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/structure')
    const add = await screen.findByRole('region', { name: 'Add to structure' })
    expect(
      within(add)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['+ Intro', '+ Verse', '+ Chorus', '+ Bridge', '+ Outro'])
  })

  it('appends a section to the end, even one already used', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/structure')
    await user.click(await screen.findByRole('button', { name: 'Add Chorus to structure' }))
    await user.click(screen.getByRole('button', { name: 'Add Outro to structure' }))
    expect(order().slice(-3)).toEqual(['Outro', 'Chorus', 'Outro'])
    expect(order()).toHaveLength(10)
  })

  it('removes just the chosen slot and renumbers the rest', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/structure')
    await user.click(await screen.findByRole('button', { name: 'Remove Verse from position 2' }))

    expect(order()).toEqual(['Intro', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'])
    // The second Verse moved from position 4 to position 3.
    expect(screen.getByRole('button', { name: 'Reorder Verse, position 3' })).toBeInTheDocument()
  })

  it('saves the new order and returns to the song', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/songs/piano-man/structure')
    await user.click(await screen.findByRole('button', { name: 'Remove Bridge from position 6' }))
    await user.click(screen.getByRole('button', { name: 'Add Bridge to structure' }))
    await user.click(screen.getByRole('button', { name: 'Save structure' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/songs/piano-man'))
    const song = await repos.songs.get('piano-man')
    expect(song?.structure.map((id) => id.replace('piano-man-s', ''))).toEqual([
      '0',
      '1',
      '2',
      '1',
      '2',
      '2',
      '4',
      '3',
    ])
    const list = await screen.findByRole('list', { name: 'Play order' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Chorus', 'Outro', 'Bridge'])
  })

  it('discards the draft if you go back without saving', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/songs/piano-man/structure')
    await user.click(await screen.findByRole('button', { name: 'Remove Intro from position 1' }))
    await user.click(screen.getByRole('link', { name: 'Back' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/songs/piano-man'))
    expect((await repos.songs.get('piano-man'))?.structure).toHaveLength(8)
  })

  it('can build a structure from nothing', async () => {
    await loadSamples()
    const verse = await repos.sections.create('rocket-man', { name: 'Verse' })
    const chorus = await repos.sections.create('rocket-man', { name: 'Chorus' })
    const user = userEvent.setup()
    renderApp('/songs/rocket-man/structure')
    expect(await screen.findByText(/Nothing in the order yet/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Verse to structure' }))
    await user.click(screen.getByRole('button', { name: 'Add Chorus to structure' }))
    await user.click(screen.getByRole('button', { name: 'Add Verse to structure' }))
    await user.click(screen.getByRole('button', { name: 'Save structure' }))

    await waitFor(async () =>
      expect((await repos.songs.get('rocket-man'))?.structure).toEqual([
        verse.id,
        chorus.id,
        verse.id,
      ]),
    )
  })

  it('can save an emptied structure', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/structure')
    await screen.findByRole('list', { name: 'Play order' })
    for (let i = 0; i < 8; i++) {
      await user.click(screen.getAllByRole('button', { name: /^Remove / })[0])
    }
    expect(await screen.findByText(/Nothing in the order yet/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save structure' }))
    await waitFor(async () => expect((await repos.songs.get('piano-man'))?.structure).toEqual([]))
  })

  it('sends you to add a section when the song has none', async () => {
    await loadSamples()
    renderApp('/songs/rocket-man/structure')
    expect(await screen.findByText(/no sections to arrange yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add a section' })).toHaveAttribute(
      'href',
      '/songs/rocket-man/sections/new',
    )
    expect(screen.queryByRole('button', { name: 'Save structure' })).not.toBeInTheDocument()
  })

  it('says so when the song does not exist', async () => {
    renderApp('/songs/nope/structure')
    expect(await screen.findByText('Song not found')).toBeInTheDocument()
  })
})
