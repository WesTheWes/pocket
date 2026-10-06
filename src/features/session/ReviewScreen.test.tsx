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

// The sample session: 24 minutes of practice (plus 3 paused), with attempts on two goals.
const DAY = 24 * 60 * 60 * 1000
const REVIEW = '/practice/piano-man/review/piano-man-session'

const workedOn = () => within(screen.getByRole('region', { name: 'Worked on' }))
const card = (title: string) => workedOn().getByText(title).closest('li') as HTMLElement

describe('ReviewScreen', () => {
  it('shows how long you practiced, excluding time paused', async () => {
    await loadSamples()
    renderApp(REVIEW)
    expect(await screen.findByText('Practice complete')).toBeInTheDocument()
    expect(screen.getByText('24:00')).toBeInTheDocument()
    expect(screen.getByText('Piano Man · Billy Joel')).toBeInTheDocument()
  })

  it('counts goals worked on and goals improved', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    expect(screen.getByText('Goals worked').previousElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Improved').previousElementSibling).toHaveTextContent('1')
  })

  it('compares the last attempt before the session with the last one in it', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    const bars = card('First 4 bars with only bass and melody')
    expect(within(bars).getByText('Verse')).toBeInTheDocument()
    expect(within(bars).getByText('64 → 76 BPM')).toBeInTheDocument()
    expect(within(bars).getByText('Solid → Few mistakes')).toBeInTheDocument()
    expect(within(bars).getByText('+12 BPM')).toBeInTheDocument()

    const fill = card('Walk-up fill into bar 5')
    expect(within(fill).getByText('Chorus')).toBeInTheDocument()
    expect(within(fill).getByText('60 → 42 BPM')).toBeInTheDocument()
    expect(within(fill).getByText('Many mistakes → Solid')).toBeInTheDocument()
    expect(within(fill).getByText('quality up')).toBeInTheDocument()
  })

  it('charts progress before and after for the whole song and each goal worked on', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    const chart = screen.getByRole('list', { name: 'Progress before and after this session' })
    const rows = within(chart).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByText('Overall progress · every goal')).toBeInTheDocument()
    expect(within(rows[1]).getByText('First 4 bars with only bass and melody')).toBeInTheDocument()
    expect(within(rows[1]).getByText('unchanged at 76%')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Walk-up fill into bar 5')).toBeInTheDocument()
    expect(within(rows[2]).getByText('from 0% to 50%')).toBeInTheDocument()
  })

  it('notes when the last attempt before the session was long ago', async () => {
    // The sample data as it was a month ago, so every earlier attempt is at least that old.
    await repos.backup.replaceAll(createSeedData(Date.now() - 30 * DAY))
    const session = await repos.sessions.startOrResume('piano-man')
    await repos.attempts.create({
      goalId: 'piano-man-g5',
      bpm: 48,
      level: 4,
      sessionId: session.id,
    })
    await repos.sessions.end(session.id)
    renderApp(`/practice/piano-man/review/${session.id}`)
    await screen.findByText('Practice complete')
    expect(
      within(card('Walk-up fill into bar 5')).getByText('Last time: 4 weeks ago'),
    ).toBeVisible()
  })

  it('does not note a recent earlier attempt', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    expect(screen.queryByText(/Last time/)).not.toBeInTheDocument()
  })

  it('lists only goals that were worked on in this session', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    expect(screen.queryByText('Left hand waltz pattern')).not.toBeInTheDocument()
    expect(screen.queryByText('Land the ending fill')).not.toBeInTheDocument()
  })

  it('links each goal to its progress screen', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    expect(
      screen.getByRole('link', { name: 'Edit progress for Walk-up fill into bar 5' }),
    ).toHaveAttribute('href', '/songs/piano-man/goals/piano-man-g5')
  })

  it('calls out a goal that reached its target', async () => {
    await loadSamples()
    const session = await repos.sessions.startOrResume('piano-man')
    await repos.attempts.create({
      goalId: 'piano-man-g3',
      bpm: 84,
      level: 4,
      sessionId: session.id,
    })
    await repos.sessions.end(session.id)
    renderApp(`/practice/piano-man/review/${session.id}`)

    await screen.findByText('Practice complete')
    const item = card('First 4 bars with only bass and melody')
    expect(within(item).getByText('76 → 84 BPM')).toBeInTheDocument()
    expect(within(item).getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Improved').previousElementSibling).toHaveTextContent('1')
  })

  it('shows a whole-song goal under "Whole song"', async () => {
    await loadSamples()
    const session = await repos.sessions.startOrResume('piano-man')
    await repos.attempts.create({
      goalId: 'piano-man-g0',
      bpm: 60,
      level: 3,
      sessionId: session.id,
    })
    await repos.sessions.end(session.id)
    renderApp(`/practice/piano-man/review/${session.id}`)
    await screen.findByText('Practice complete')
    const goal = card('Play start to finish without stopping')
    expect(within(goal).getByText('Whole song')).toBeInTheDocument()
  })

  it('explains an empty session', async () => {
    await loadSamples()
    const session = await repos.sessions.startOrResume('rocket-man')
    await repos.sessions.end(session.id)
    renderApp(`/practice/rocket-man/review/${session.id}`)
    expect(await screen.findByText(/No attempts were logged in this session/)).toBeInTheDocument()
    expect(screen.getByText('Goals worked').previousElementSibling).toHaveTextContent('0')
  })

  it('offers Practice again, Done, and Close', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    expect(screen.getByRole('link', { name: 'Practice again' })).toHaveAttribute(
      'href',
      '/practice/piano-man',
    )
    expect(screen.getByRole('link', { name: 'Done' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Close' })).toHaveAttribute('href', '/')
  })

  it('says so for a session that does not exist or belongs to another song', async () => {
    await loadSamples()
    const { unmount } = renderApp('/practice/piano-man/review/nope')
    expect(await screen.findByText('Session not found')).toBeInTheDocument()
    unmount()
    renderApp('/practice/sir-duke/review/piano-man-session')
    expect(await screen.findByText('Session not found')).toBeInTheDocument()
  })

  it('says so when the song does not exist', async () => {
    renderApp('/practice/nope/review/x')
    expect(await screen.findByText('Song not found')).toBeInTheDocument()
  })
})

describe('attempt notes', () => {
  it('lists the notes written during the session under the goal', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    const notes = within(
      within(card('First 4 bars with only bass and melody')).getByRole('list', {
        name: 'Notes for First 4 bars with only bass and melody',
      }),
    )
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(notes).toEqual([
      '68 BPMLeft hand drags behind in bar 3.',
      '76 BPMBetter once I slowed bar 3 right down. Try 80 next time.',
    ])
  })

  it('shows no notes list for a goal whose session attempts had none', async () => {
    await loadSamples()
    await repos.attempts.update('piano-man-g5-a2', { note: '' })
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    expect(
      within(card('Walk-up fill into bar 5')).queryByRole('list', { name: /^Notes for/ }),
    ).not.toBeInTheDocument()
  })
})

describe('charts', () => {
  it('charts the song’s progress over its sessions, ringing this one', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    const chart = screen.getByRole('img', {
      name: 'Song progress over 1 session: 62% before the first, 68% after the latest.',
    })
    expect(chart).toBeInTheDocument()
    expect(screen.getByText('1 session')).toBeInTheDocument()
    const items = within(chart.parentElement!)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(items).toEqual(['Before: 62%', 'This session: 68%'])
  })

  it('adds a point for every finished session, oldest first', async () => {
    await loadSamples()
    const later = await repos.sessions.startOrResume('piano-man')
    await repos.attempts.create({ goalId: 'piano-man-g6', bpm: 100, level: 4, sessionId: later.id })
    await repos.sessions.end(later.id)
    renderApp(`/practice/piano-man/review/${later.id}`)
    await screen.findByText('Practice complete')
    expect(screen.getByText('2 sessions')).toBeInTheDocument()
    const items = within(screen.getByRole('img', { name: /^Song progress/ }).parentElement!)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(items).toEqual(['Before: 62%', '2 days ago: 68%', 'This session: 80%'])
  })

  it('charts each goal’s tempos this session against its target', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    expect(
      within(card('First 4 bars with only bass and melody')).getByRole('img', {
        name: 'Tempos this session for First 4 bars with only bass and melody: 68 BPM (Many mistakes), 76 BPM (Few mistakes). Target 84 BPM.',
      }),
    ).toBeInTheDocument()
  })

  it('draws no tempo chart when none of the session’s attempts had a tempo', async () => {
    await loadSamples()
    await repos.attempts.update('piano-man-g5-a1', { bpm: null })
    await repos.attempts.update('piano-man-g5-a2', { bpm: null })
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    expect(
      within(card('Walk-up fill into bar 5')).queryByRole('img', { name: /^Tempos/ }),
    ).not.toBeInTheDocument()
  })
})

describe('firsts and next time', () => {
  it('lists what the session was the first to do', async () => {
    await loadSamples()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    const firsts = within(screen.getByRole('region', { name: 'Today’s firsts' }))
    const cards = firsts.getAllByRole('listitem').map((li) => li.textContent)
    expect(cards).toEqual(['First Solid42 BPM on Walk-up fill into bar 5'])
  })

  it('celebrates a goal done and counts what it opened', async () => {
    await loadSamples()
    const session = await repos.sessions.startOrResume('piano-man')
    await repos.attempts.create({
      goalId: 'piano-man-g4',
      bpm: 90,
      level: 4,
      sessionId: session.id,
    })
    await repos.sessions.end(session.id)
    renderApp(`/practice/piano-man/review/${session.id}`)
    await screen.findByText('Practice complete')
    expect(screen.getByText('Unlocked').previousElementSibling).toHaveTextContent('1')
    const cards = within(screen.getByRole('region', { name: 'Today’s firsts' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    // Level 1 still has open goals, so no level was reached.
    expect(cards).toEqual(['Goal doneFull chorus with block chords'])
  })

  it('suggests where to start next time, landing Practice on the tempo', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(REVIEW)
    await screen.findByText('Practice complete')
    const next = within(screen.getByRole('region', { name: 'Next time, start with' }))
    expect(next.getByText('First 4 bars with only bass and melody')).toBeInTheDocument()
    expect(next.getByText('Verse · fastest Solid 64 of 84 BPM · 20 to go')).toBeInTheDocument()
    await user.click(
      next.getByRole('link', { name: 'Start First 4 bars with only bass and melody' }),
    )
    expect(await screen.findByRole('slider', { name: 'Tempo' })).toHaveValue('72')
  })
})
