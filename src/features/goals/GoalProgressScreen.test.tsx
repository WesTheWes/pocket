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

// "First 4 bars with only bass and melody": target 84, attempts 60/64/68/76 (newest first: 76).
const URL_BARS = '/songs/piano-man/goals/piano-man-g3'
const tempo = () => screen.getByRole('textbox', { name: 'Tempo you played, in BPM' })
const history = () => screen.getByRole('region', { name: 'History' })
const historyText = () =>
  within(history())
    .getAllByRole('listitem')
    .map((li) => li.textContent ?? '')

describe('GoalProgressScreen', () => {
  it('shows the section, title and progress toward the target', async () => {
    await loadSamples()
    renderApp(URL_BARS)
    expect(
      await screen.findByRole('heading', {
        name: 'First 4 bars with only bass and melody',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Verse', { selector: 'div' })).toBeInTheDocument()
    expect(screen.getByText('fastest Solid 64 of 84 BPM')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Goal progress' })).toHaveAttribute(
      'aria-valuenow',
      '76',
    )
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
  })

  it('labels a whole-song goal as such', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals/piano-man-g0')
    expect(await screen.findByText('Whole song', { selector: 'div' })).toBeInTheDocument()
  })

  it('marks a finished goal as Done', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals/piano-man-g7')
    expect(await screen.findByText('Done')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Goal progress' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })

  it('lists the history newest first, with tempo and quality by name', async () => {
    await loadSamples()
    renderApp(URL_BARS)
    await screen.findByRole('region', { name: 'History' })
    const rows = historyText()
    expect(rows).toHaveLength(4)
    expect(rows[0]).toContain('76 BPM')
    expect(rows[0]).toContain('Few mistakes')
    expect(rows[1]).toContain('68 BPM')
    expect(rows[1]).toContain('Many mistakes')
    expect(rows[2]).toContain('64 BPM')
    expect(rows[2]).toContain('Solid')
    expect(rows[3]).toContain('60 BPM')
  })

  it('starts the tempo at the last one you logged', async () => {
    await loadSamples()
    renderApp(URL_BARS)
    expect(await screen.findByRole('textbox', { name: 'Tempo you played, in BPM' })).toHaveValue(
      '76',
    )
  })

  it('links to editing the goal', async () => {
    await loadSamples()
    renderApp(URL_BARS)
    expect(await screen.findByRole('link', { name: 'Edit goal' })).toHaveAttribute(
      'href',
      '/songs/piano-man/goals/piano-man-g3/edit',
    )
  })

  it('offers to practice the goal, starting the session on it', async () => {
    await loadSamples()
    renderApp(URL_BARS)
    expect(await screen.findByRole('link', { name: 'Practice this goal' })).toHaveAttribute(
      'href',
      '/practice/piano-man?goal=piano-man-g3',
    )
  })

  it('says so for a goal that does not exist or belongs to another song', async () => {
    await loadSamples()
    const { unmount } = renderApp('/songs/piano-man/goals/nope')
    expect(await screen.findByText('Goal not found')).toBeInTheDocument()
    unmount()
    renderApp('/songs/sir-duke/goals/piano-man-g3')
    expect(await screen.findByText('Goal not found')).toBeInTheDocument()
  })
})

describe('logging an attempt', () => {
  it('asks how it felt rather than guessing, and saves nothing', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await user.click(await screen.findByRole('button', { name: 'Save attempt' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose how it felt')
    expect(await repos.attempts.listByGoal('piano-man-g3')).toHaveLength(4)
  })

  it('clears that message once you choose', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await user.click(await screen.findByRole('button', { name: 'Save attempt' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('radio', { name: 'Solid' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('records the attempt, updates progress, and keeps the tempo for the next one', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('textbox', { name: 'Tempo you played, in BPM' })
    await user.clear(tempo())
    await user.type(tempo(), '84')
    await user.tab()
    await user.click(screen.getByRole('radio', { name: 'Solid' }))
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Attempt saved')
    // It became the goal's fastest Solid tempo, which meets the target.
    expect(await screen.findByText('fastest Solid 84 of 84 BPM')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(historyText()).toHaveLength(5)
    expect(historyText()[0]).toContain('84 BPM')
    expect(historyText()[0]).toContain('Solid')
    expect(historyText()[0]).toContain('Today')

    // Ready for another go: same tempo, nothing chosen.
    expect(tempo()).toHaveValue('84')
    expect(screen.getByRole('radio', { name: 'Solid' })).not.toBeChecked()

    const [latest] = await repos.attempts.listByGoal('piano-man-g3')
    expect(latest).toMatchObject({ bpm: 84, level: 4, sessionId: null })
  })

  it('does not count a fast attempt that was not Solid', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('textbox', { name: 'Tempo you played, in BPM' })
    await user.clear(tempo())
    await user.type(tempo(), '120')
    await user.tab()
    await user.click(screen.getByRole('radio', { name: 'Few mistakes' }))
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))
    await screen.findByRole('status')
    expect(screen.getByText('fastest Solid 64 of 84 BPM')).toBeInTheDocument()
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
  })

  it("logs a Can't play at all in the history without it counting as progress", async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('textbox', { name: 'Tempo you played, in BPM' })
    await user.click(screen.getByRole('radio', { name: "Can't play at all" }))
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))
    await screen.findByRole('status')
    expect(historyText()[0]).toContain("Can't play at all")
    expect(screen.getByText('fastest Solid 64 of 84 BPM')).toBeInTheDocument()
  })

  it('can log an attempt with no tempo', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('textbox', { name: 'Tempo you played, in BPM' })
    await user.click(screen.getByRole('checkbox', { name: 'No tempo' }))
    await user.click(screen.getByRole('radio', { name: 'Perfection' }))
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))
    await screen.findByRole('status')
    expect(historyText()[0]).toContain('No tempo')
    const [latest] = await repos.attempts.listByGoal('piano-man-g3')
    expect(latest.bpm).toBeNull()
  })

  it('attaches the open practice session to the attempt', async () => {
    await loadSamples()
    const session = await repos.sessions.startOrResume('rocket-man')
    const goal = await repos.goals.create({ songId: 'rocket-man', title: 'Play it', targetBpm: 80 })
    const user = userEvent.setup()
    renderApp(`/songs/rocket-man/goals/${goal.id}`)
    await user.click(await screen.findByRole('radio', { name: 'Solid' }))
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))
    await screen.findByRole('status')
    const [attempt] = await repos.attempts.listByGoal(goal.id)
    expect(attempt.sessionId).toBe(session.id)
  })

  it('does not attach a session that has ended', async () => {
    await loadSamples()
    const session = await repos.sessions.startOrResume('rocket-man')
    await repos.sessions.end(session.id)
    const goal = await repos.goals.create({ songId: 'rocket-man', title: 'Play it', targetBpm: 80 })
    const user = userEvent.setup()
    renderApp(`/songs/rocket-man/goals/${goal.id}`)
    await user.click(await screen.findByRole('radio', { name: 'Solid' }))
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))
    await screen.findByRole('status')
    const [attempt] = await repos.attempts.listByGoal(goal.id)
    expect(attempt.sessionId).toBeNull()
  })

  it('invites you to log a first attempt', async () => {
    await loadSamples()
    const goal = await repos.goals.create({ songId: 'rocket-man', title: 'Play it', targetBpm: 80 })
    renderApp(`/songs/rocket-man/goals/${goal.id}`)
    expect(await screen.findByText(/No attempts yet/)).toBeInTheDocument()
    expect(screen.getByText('No Solid attempt yet')).toBeInTheDocument()
    // With no history the tempo starts at the target.
    expect(screen.getByRole('textbox', { name: 'Tempo you played, in BPM' })).toHaveValue('80')
  })
})

describe('editing and deleting attempts', () => {
  it('edits an attempt in the same form', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('region', { name: 'History' })
    await user.click(screen.getAllByRole('button', { name: /^Edit attempt from/ })[1])

    expect(screen.getByRole('heading', { name: 'Edit attempt' })).toBeInTheDocument()
    expect(tempo()).toHaveValue('68') // the second-newest attempt
    expect(screen.getByRole('radio', { name: 'Many mistakes' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'Solid' }))
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Log attempt' })).toBeInTheDocument(),
    )
    expect(historyText()).toHaveLength(4)
    expect(historyText()[1]).toContain('68 BPM')
    expect(historyText()[1]).toContain('Solid')
    expect(screen.getByText('fastest Solid 68 of 84 BPM')).toBeInTheDocument()
  })

  it('cancels an edit without changing anything', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('region', { name: 'History' })
    await user.click(screen.getAllByRole('button', { name: /^Edit attempt from/ })[0])
    await user.click(screen.getByRole('radio', { name: 'Perfection' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('heading', { name: 'Log attempt' })).toBeInTheDocument()
    expect(historyText()[0]).toContain('Few mistakes')
  })

  it('switches straight to another attempt if you tap a different edit', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('region', { name: 'History' })
    const edits = screen.getAllByRole('button', { name: /^Edit attempt from/ })
    await user.click(edits[0])
    expect(tempo()).toHaveValue('76')
    await user.click(edits[3])
    expect(tempo()).toHaveValue('60')
  })

  it('asks before deleting an attempt, naming it', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('region', { name: 'History' })
    await user.click(screen.getAllByRole('button', { name: /^Delete attempt from/ })[0])
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Delete this attempt?' }),
    ).toBeInTheDocument()
    expect(dialog).toHaveTextContent('76 BPM · Few mistakes from')
    expect(dialog).toHaveTextContent('This can’t be undone.')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(historyText()).toHaveLength(4)
  })

  it('deletes an attempt and recomputes progress', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('region', { name: 'History' })
    // The 64 BPM Solid attempt is the only Solid one, so removing it removes all progress.
    await user.click(screen.getAllByRole('button', { name: /^Delete attempt from/ })[2])
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete attempt' }))

    await waitFor(() => expect(historyText()).toHaveLength(3))
    expect(await screen.findByText('No Solid attempt yet')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Goal progress' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
    expect(await repos.attempts.listByGoal('piano-man-g3')).toHaveLength(3)
  })
})

describe('attempt notes', () => {
  it('saves a note with the attempt and shows it in the history', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('heading', { name: 'First 4 bars with only bass and melody', level: 1 })
    await user.click(screen.getByRole('radio', { name: 'Solid' }))
    await user.type(screen.getByRole('textbox', { name: 'Note' }), '  Bar 3 still drags  ')
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))
    await waitFor(() => expect(historyText()[0]).toContain('Bar 3 still drags'))
    // The form is ready for the next attempt, with an empty note.
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveValue('')
    const latest = (await repos.attempts.listByGoal('piano-man-g3'))[0]
    expect(latest.note).toBe('Bar 3 still drags')
  })

  it('edits the note of an earlier attempt', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(URL_BARS)
    await screen.findByRole('heading', { name: 'First 4 bars with only bass and melody', level: 1 })
    expect(historyText()[0]).toContain('Better once I slowed bar 3 right down.')
    await user.click(within(history()).getAllByRole('button', { name: /^Edit attempt/ })[0])
    const note = screen.getByRole('textbox', { name: 'Note' })
    expect(note).toHaveValue('Better once I slowed bar 3 right down. Try 80 next time.')
    await user.clear(note)
    await user.type(note, 'Fixed it')
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))
    await waitFor(() => expect(historyText()[0]).toContain('Fixed it'))
    expect(historyText()[0]).not.toContain('Better once')
  })
})
