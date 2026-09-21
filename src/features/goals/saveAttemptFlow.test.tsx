import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { repos } from '../../data'
import { createSeedData } from '../../data/seed'
import { installFakeAudio } from '../../test/fakeAudio'
import { renderApp } from '../../test/renderApp'

beforeEach(() => {
  installFakeAudio()
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await repos.backup.clear()
})

async function loadSamples() {
  await repos.backup.replaceAll(createSeedData(Date.now()))
}

const save = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole('button', { name: 'Save attempt' }))

describe('saving an attempt that you logged from Practice', () => {
  async function fromPractice() {
    await loadSamples()
    const user = userEvent.setup()
    const view = renderApp('/practice/piano-man?goal=piano-man-g4')
    await user.click(await screen.findByRole('link', { name: 'Log attempt' }))
    await user.click(await screen.findByRole('radio', { name: 'Solid' }))
    return { user, ...view }
  }

  it('confirms the save and takes you back to the same goal in Practice', async () => {
    const { user, router } = await fromPractice()
    await save(user)

    await waitFor(() => expect(router.state.location.pathname).toBe('/practice/piano-man'))
    expect(router.state.location.search).toBe('?goal=piano-man-g4')
    expect(await screen.findByRole('status')).toHaveTextContent('Attempt saved')
    expect(
      await screen.findByRole('heading', { name: 'Full chorus with block chords', level: 1 }),
    ).toBeInTheDocument()
  })

  it('has really saved it by the time you are back, against your session', async () => {
    const { user } = await fromPractice()
    await screen.findByRole('timer', { name: 'Practice time' }).catch(() => undefined)
    await save(user)
    await screen.findByRole('timer', { name: 'Practice time' })

    const [latest] = await repos.attempts.listByGoal('piano-man-g4')
    const [session] = (await repos.sessions.listBySong('piano-man')).filter(
      (s) => s.endedAt === null,
    )
    expect(latest).toMatchObject({ level: 4 })
    expect(latest.sessionId).toBe(session.id)
  })

  it('keeps the practice timer and metronome tempo going', async () => {
    const { user } = await fromPractice()
    await save(user)
    expect(await screen.findByRole('timer', { name: 'Practice time' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Tempo' })).toHaveAttribute(
      'aria-valuetext',
      '68 BPM',
    )
  })

  it('does not leave the screen, or announce anything, if you forgot to say how it felt', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man?goal=piano-man-g4')
    await user.click(await screen.findByRole('link', { name: 'Log attempt' }))
    await save(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose how it felt')
    expect(router.state.location.pathname).toBe('/songs/piano-man/goals/piano-man-g4')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('saving an attempt anywhere else', () => {
  it('confirms the save but stays put when opened from the Goals list', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/songs/piano-man/goals')
    await user.click((await screen.findByText('Full chorus with block chords')).closest('a')!)
    await user.click(await screen.findByRole('radio', { name: 'Solid' }))
    await save(user)

    expect(await screen.findByRole('status')).toHaveTextContent('Attempt saved')
    expect(router.state.location.pathname).toBe('/songs/piano-man/goals/piano-man-g4')
    expect(screen.getByRole('heading', { name: 'Log attempt' })).toBeInTheDocument()
  })

  it('stays put when opened from the review', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man/review/piano-man-session')
    await user.click(
      await screen.findByRole('link', { name: 'Edit progress for Walk-up fill into bar 5' }),
    )
    await user.click(await screen.findByRole('radio', { name: 'Solid' }))
    await save(user)
    expect(await screen.findByRole('status')).toHaveTextContent('Attempt saved')
    expect(router.state.location.pathname).toBe('/songs/piano-man/goals/piano-man-g5')
  })

  it('stays put and says "updated" when you edit an existing attempt', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man?goal=piano-man-g4')
    await user.click(await screen.findByRole('link', { name: 'Log attempt' }))
    await screen.findByRole('region', { name: 'History' })
    await user.click(screen.getAllByRole('button', { name: /^Edit attempt from/ })[0])
    await user.click(await screen.findByRole('radio', { name: 'Solid' }))
    await save(user)

    expect(await screen.findByRole('status')).toHaveTextContent('Attempt updated')
    expect(router.state.location.pathname).toBe('/songs/piano-man/goals/piano-man-g4')
  })

  it('says so when an attempt is deleted', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/songs/piano-man/goals/piano-man-g4')
    await screen.findByRole('region', { name: 'History' })
    await user.click(screen.getAllByRole('button', { name: /^Delete attempt from/ })[0])
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete attempt' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Attempt deleted')
  })
})
