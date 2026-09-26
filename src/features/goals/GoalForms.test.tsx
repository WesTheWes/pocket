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

const tempo = () => screen.getByRole('textbox', { name: 'Target tempo, in BPM' })

describe('New goal', () => {
  it('offers whole song and every section, with whole song picked by default', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals/new')
    const group = await screen.findByRole('group', { name: 'Applies to' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Whole song', 'Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'])
    expect(within(group).getByRole('button', { name: 'Whole song' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(tempo()).toHaveValue('80')
  })

  it('preselects the section from the link', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals/new?section=piano-man-s2')
    expect(await screen.findByRole('button', { name: 'Chorus' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Whole song' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('ignores a section that is not in this song', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals/new?section=nope')
    expect(await screen.findByRole('button', { name: 'Whole song' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('asks for a title and saves nothing without one', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/rocket-man/goals/new')
    await user.click(await screen.findByRole('button', { name: 'Add goal' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a title')
    expect(await repos.goals.listBySong('rocket-man')).toEqual([])
  })

  it('creates a whole-song goal with the default tempo and returns to the list', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/songs/rocket-man/goals/new')
    await user.type(await screen.findByRole('textbox', { name: 'Title' }), '  Play it through  ')
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/songs/rocket-man/goals'))
    const [goal] = await repos.goals.listBySong('rocket-man')
    expect(goal).toMatchObject({
      title: 'Play it through',
      sectionId: null,
      targetBpm: 80,
      description: '',
    })
    expect(await screen.findByText('Play it through')).toBeInTheDocument()
  })

  it("starts the target tempo at the song's tempo", async () => {
    await loadSamples()
    await repos.songs.update('rocket-man', { tempo: 136 })
    renderApp('/songs/rocket-man/goals/new')
    await waitFor(() => expect(tempo()).toHaveValue('136'))
  })

  it("starts the target tempo at the song's tempo when adding a goal from Practice too", async () => {
    await loadSamples()
    await repos.songs.update('rocket-man', { tempo: 136 })
    const user = userEvent.setup()
    renderApp('/practice/rocket-man')
    await user.click(await screen.findByRole('button', { name: 'Add a goal' }))
    expect(await screen.findByRole('textbox', { name: 'Target tempo, in BPM' })).toHaveValue('136')
  })

  it('creates a section goal with a chosen tempo and description', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/goals/new?section=piano-man-s3')
    await user.type(await screen.findByRole('textbox', { name: 'Title' }), 'Stride left hand')
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'No wrong notes')
    await user.clear(tempo())
    await user.type(tempo(), '110')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    await screen.findByRole('button', { name: /^All/ })
    const created = (await repos.goals.listBySong('piano-man')).find(
      (g) => g.title === 'Stride left hand',
    )
    expect(created).toMatchObject({
      sectionId: 'piano-man-s3',
      description: 'No wrong notes',
      targetBpm: 110,
    })
  })

  it('creates a goal with no target tempo', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/rocket-man/goals/new')
    await user.type(await screen.findByRole('textbox', { name: 'Title' }), 'Memorise the changes')
    await user.click(screen.getByRole('checkbox', { name: 'No target tempo' }))
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    await screen.findByText('Memorise the changes')
    const [goal] = await repos.goals.listBySong('rocket-man')
    expect(goal.targetBpm).toBeNull()
  })

  it('says so when the song does not exist', async () => {
    renderApp('/songs/nope/goals/new')
    expect(await screen.findByText('Song not found')).toBeInTheDocument()
  })
})

describe('Edit goal', () => {
  it('is prefilled with the goal', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals/piano-man-g3/edit')
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue(
      'First 4 bars with only bass and melody',
    )
    expect(tempo()).toHaveValue('84')
    expect(screen.getByRole('button', { name: 'Verse' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows no tempo for a goal that has none', async () => {
    await loadSamples()
    const goal = await repos.goals.create({
      songId: 'rocket-man',
      title: 'Memorise',
      targetBpm: null,
    })
    renderApp(`/songs/rocket-man/goals/${goal.id}/edit`)
    expect(await screen.findByRole('checkbox', { name: 'No target tempo' })).toBeChecked()
    expect(tempo()).toHaveValue('—')
  })

  it('saves changes, including moving to another section, and shows the goal', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/songs/piano-man/goals/piano-man-g3/edit')
    await screen.findByRole('textbox', { name: 'Title' })
    await user.click(screen.getByRole('button', { name: 'Chorus' }))
    await user.click(screen.getByRole('button', { name: 'Decrease tempo' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/songs/piano-man/goals/piano-man-g3'),
    )
    expect(await repos.goals.get('piano-man-g3')).toMatchObject({
      sectionId: 'piano-man-s2',
      targetBpm: 83,
    })
  })

  it('can lower the target so the goal becomes done', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/goals/piano-man-g3/edit')
    await screen.findByRole('textbox', { name: 'Title' })
    await user.clear(tempo())
    await user.type(tempo(), '64')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    // Fastest Solid was 64, so it now meets its target.
    expect(await screen.findByText('Done')).toBeInTheDocument()
  })

  it('refuses a blank title', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/goals/piano-man-g3/edit')
    await user.clear(await screen.findByRole('textbox', { name: 'Title' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a title')
    expect((await repos.goals.get('piano-man-g3'))?.title).toBe(
      'First 4 bars with only bass and melody',
    )
  })

  it('says so for a goal that does not exist or belongs to another song', async () => {
    await loadSamples()
    const { unmount } = renderApp('/songs/piano-man/goals/nope/edit')
    expect(await screen.findByText('Goal not found')).toBeInTheDocument()
    unmount()
    renderApp('/songs/sir-duke/goals/piano-man-g3/edit')
    expect(await screen.findByText('Goal not found')).toBeInTheDocument()
  })
})

describe('Deleting a goal', () => {
  async function openConfirm() {
    await loadSamples()
    const user = userEvent.setup()
    const view = renderApp('/songs/piano-man/goals/piano-man-g3/edit')
    await user.click(await screen.findByRole('button', { name: 'Delete goal' }))
    const dialog = await screen.findByRole('dialog')
    return { user, dialog, ...view }
  }

  it('asks first, naming the goal and its attempts', async () => {
    const { dialog } = await openConfirm()
    expect(within(dialog).getByRole('heading', { name: 'Delete this goal?' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent(
      '“First 4 bars with only bass and melody” and its 4 attempts will be removed. This can’t be undone.',
    )
  })

  it('does nothing when cancelled', async () => {
    const { user, dialog } = await openConfirm()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await repos.goals.get('piano-man-g3')).toBeDefined()
    expect(await repos.attempts.listByGoal('piano-man-g3')).toHaveLength(4)
  })

  it('removes the goal and its attempts, then returns to the list', async () => {
    const { user, dialog, router } = await openConfirm()
    const before = (await repos.attempts.listBySong('piano-man')).length
    await user.click(within(dialog).getByRole('button', { name: 'Delete goal' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/songs/piano-man/goals'))
    expect(await repos.goals.get('piano-man-g3')).toBeUndefined()
    expect(await repos.attempts.listByGoal('piano-man-g3')).toEqual([])
    expect((await repos.attempts.listBySong('piano-man')).length).toBe(before - 4)
    expect(await screen.findByRole('button', { name: 'All 7' })).toBeInTheDocument()
    expect(screen.queryByText('Goal not found')).not.toBeInTheDocument()
  })
})
