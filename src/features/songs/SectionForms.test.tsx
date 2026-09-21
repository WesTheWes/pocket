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

describe('New section', () => {
  it('fills the name from a preset and shows which one is picked', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/rocket-man/sections/new')
    const name = await screen.findByRole('textbox', { name: 'Name' })
    expect(name).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Pre-chorus' }))
    expect(name).toHaveValue('Pre-chorus')
    expect(screen.getByRole('button', { name: 'Pre-chorus' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Verse' })).toHaveAttribute('aria-pressed', 'false')

    await user.type(name, ' 2')
    expect(screen.getByRole('button', { name: 'Pre-chorus' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('offers every preset from the design', async () => {
    await loadSamples()
    renderApp('/songs/rocket-man/sections/new')
    const group = await screen.findByRole('group', { name: 'Common names' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Intro', 'Verse', 'Pre-chorus', 'Chorus', 'Bridge', 'Solo', 'Outro'])
  })

  it('asks for a name and saves nothing without one', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/rocket-man/sections/new')
    await user.click(await screen.findByRole('button', { name: 'Add section' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a name')
    expect(await repos.sections.listBySong('rocket-man')).toEqual([])
  })

  it('clears the error as soon as a preset is chosen', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/rocket-man/sections/new')
    await user.click(await screen.findByRole('button', { name: 'Add section' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Chorus' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('adds the section to the song and shows it there', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/songs/rocket-man/sections/new')
    await user.click(await screen.findByRole('button', { name: 'Verse' }))
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'Watch the pickup')
    await user.click(screen.getByRole('button', { name: 'Add section' }))

    expect(await screen.findByRole('heading', { name: 'Rocket Man', level: 1 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/songs/rocket-man')
    const [section] = await repos.sections.listBySong('rocket-man')
    expect(section).toMatchObject({ name: 'Verse', notes: 'Watch the pickup', order: 0 })
    expect(await screen.findByText('No goals yet', { selector: 'div' })).toBeInTheDocument()
  })

  it('says so when the song does not exist', async () => {
    renderApp('/songs/nope/sections/new')
    expect(await screen.findByText('Song not found')).toBeInTheDocument()
  })
})

describe('Edit section', () => {
  it('is prefilled and lists the section’s goals with their progress', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/sections/piano-man-s1')
    expect(await screen.findByRole('textbox', { name: 'Name' })).toHaveValue('Verse')

    const goals = screen.getByRole('region', { name: 'Goals in this section' })
    const waltz = within(goals).getByText('Left hand waltz pattern').closest('a')!
    expect(within(waltz).getByText('fastest Solid 72 of 72 BPM')).toBeInTheDocument()
    expect(within(waltz).getByText('Done')).toBeInTheDocument()
    const bars = within(goals).getByText('First 4 bars with only bass and melody').closest('a')!
    expect(within(bars).getByText('fastest Solid 64 of 84 BPM')).toBeInTheDocument()
    expect(within(bars).queryByText('Done')).not.toBeInTheDocument()
  })

  it('shows progress, never a standalone rating, on goal cards', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/sections/piano-man-s1')
    const goals = await screen.findByRole('region', { name: 'Goals in this section' })
    for (const label of ["Can't yet", 'Rough', 'Shaky', 'Mastered']) {
      expect(within(goals).queryByText(label)).not.toBeInTheDocument()
    }
  })

  it('links Add to a new goal for this section', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/sections/piano-man-s1')
    const goals = await screen.findByRole('region', { name: 'Goals in this section' })
    expect(within(goals).getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/songs/piano-man/goals/new?section=piano-man-s1',
    )
  })

  it('invites you to add a first goal when there are none', async () => {
    await loadSamples()
    const section = await repos.sections.create('rocket-man', { name: 'Verse' })
    renderApp(`/songs/rocket-man/sections/${section.id}`)
    expect(await screen.findByText(/No goals yet\. Add one/)).toBeInTheDocument()
  })

  it('saves a rename and shows it on the song', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/sections/piano-man-s1')
    await user.click(await screen.findByRole('button', { name: 'Solo' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByRole('heading', { name: 'Piano Man', level: 1 })
    expect((await repos.sections.get('piano-man-s1'))?.name).toBe('Solo')
    // The structure refers to the section by id, so both slots follow the rename.
    const order = await screen.findByRole('list', { name: 'Play order' })
    expect(within(order).getAllByText('Solo')).toHaveLength(2)
  })

  it('refuses a blank name', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/sections/piano-man-s1')
    await user.clear(await screen.findByRole('textbox', { name: 'Name' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a name')
    expect((await repos.sections.get('piano-man-s1'))?.name).toBe('Verse')
  })

  it('says so when the section belongs to a different song', async () => {
    await loadSamples()
    renderApp('/songs/sir-duke/sections/piano-man-s1')
    expect(await screen.findByText('Section not found')).toBeInTheDocument()
  })

  it('says so when the section does not exist', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/sections/nope')
    expect(await screen.findByText('Section not found')).toBeInTheDocument()
  })
})

describe('Deleting a section', () => {
  async function openConfirm() {
    await loadSamples()
    const user = userEvent.setup()
    const view = renderApp('/songs/piano-man/sections/piano-man-s1')
    await user.click(await screen.findByRole('button', { name: 'Delete section' }))
    const dialog = await screen.findByRole('dialog')
    return { user, dialog, ...view }
  }

  it('asks first, naming its goals and that it leaves the structure', async () => {
    const { dialog } = await openConfirm()
    expect(within(dialog).getByRole('heading', { name: 'Delete “Verse”?' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent(
      'Its 2 goals and their progress history will be removed, and it will be taken out of the song structure. This can’t be undone.',
    )
  })

  it('does nothing when cancelled', async () => {
    const { user, dialog } = await openConfirm()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await repos.sections.get('piano-man-s1')).toBeDefined()
    expect(await repos.goals.listBySong('piano-man')).toHaveLength(8)
  })

  it('removes the section, its goals, and every slot for it, then returns to the song', async () => {
    const { user, dialog, router } = await openConfirm()
    await user.click(within(dialog).getByRole('button', { name: 'Delete section' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/songs/piano-man'))
    expect(await repos.sections.get('piano-man-s1')).toBeUndefined()
    expect(await repos.goals.listBySong('piano-man')).toHaveLength(6)
    const song = await repos.songs.get('piano-man')
    expect(song?.structure).toHaveLength(6)
    expect(song?.structure).not.toContain('piano-man-s1')

    // The Song screen recomputes: the deleted waltz goal was one of the 3 done.
    expect(await screen.findByText('2 of 6 goals done')).toBeInTheDocument()
    expect(screen.queryByText('Section not found')).not.toBeInTheDocument()
  })
})
