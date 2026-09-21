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

const back = () => screen.getByRole('link', { name: 'Back' })
const openSessions = async () =>
  (await repos.sessions.listBySong('piano-man')).filter((s) => s.endedAt === null)

describe('back from Goal progress returns to where you came from', () => {
  it('goes back to the practice session, on the same goal', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man?goal=piano-man-g4')
    await user.click(await screen.findByRole('link', { name: 'Log attempt' }))
    await screen.findByRole('heading', { name: 'Full chorus with block chords', level: 1 })
    expect(router.state.location.pathname).toBe('/songs/piano-man/goals/piano-man-g4')

    await user.click(back())
    await waitFor(() => expect(router.state.location.pathname).toBe('/practice/piano-man'))
    expect(router.state.location.search).toBe('?goal=piano-man-g4')
    expect(
      await screen.findByRole('heading', { name: 'Full chorus with block chords', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('timer', { name: 'Practice time' })).toBeInTheDocument()
  })

  it('carries on with the same session, and shows the attempt you just logged', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man?goal=piano-man-g4')
    await screen.findByRole('timer', { name: 'Practice time' })
    const [session] = await openSessions()

    await user.click(screen.getByRole('link', { name: 'Log attempt' }))
    await user.click(await screen.findByRole('radio', { name: 'Solid' }))
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))
    await screen.findByRole('status')
    // Saving took us back to the practice session by itself; no need to press back.

    await screen.findByRole('heading', { name: 'Full chorus with block chords', level: 1 })
    expect((await openSessions()).map((s) => s.id)).toEqual([session.id])
    const [attempt] = await repos.attempts.listByGoal('piano-man-g4')
    expect(attempt.sessionId).toBe(session.id)
  })

  it('still goes to the Goals list when opened from there', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/songs/piano-man/goals')
    await user.click((await screen.findByText('Land the ending fill')).closest('a')!)
    await screen.findByRole('heading', { name: 'Land the ending fill', level: 1 })
    await user.click(back())
    await waitFor(() => expect(router.state.location.pathname).toBe('/songs/piano-man/goals'))
  })

  it('goes to the Goals list when opened directly', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals/piano-man-g3')
    await screen.findByRole('heading', { level: 1 })
    expect(back()).toHaveAttribute('href', '/songs/piano-man/goals')
  })

  it('goes back to the review from a "worked on" card', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man/review/piano-man-session')
    await user.click(
      await screen.findByRole('link', { name: 'Edit progress for Walk-up fill into bar 5' }),
    )
    await screen.findByRole('heading', { name: 'Walk-up fill into bar 5', level: 1 })
    await user.click(back())
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/practice/piano-man/review/piano-man-session'),
    )
    expect(await screen.findByText('Practice complete')).toBeInTheDocument()
  })

  it('keeps the way back through Edit goal', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man?goal=piano-man-g4')
    await user.click(await screen.findByRole('link', { name: 'Log attempt' }))
    await user.click(await screen.findByRole('link', { name: 'Edit goal' }))
    await screen.findByRole('textbox', { name: 'Title' })

    // Back from Edit goal returns to the goal's progress, which still remembers the practice.
    await user.click(back())
    await screen.findByRole('heading', { name: 'Full chorus with block chords', level: 1 })
    expect(router.state.location.pathname).toBe('/songs/piano-man/goals/piano-man-g4')
    await user.click(back())
    await waitFor(() => expect(router.state.location.pathname).toBe('/practice/piano-man'))
  })

  it('keeps the way back after saving changes to the goal', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man?goal=piano-man-g4')
    await user.click(await screen.findByRole('link', { name: 'Log attempt' }))
    await user.click(await screen.findByRole('link', { name: 'Edit goal' }))
    await user.click(await screen.findByRole('button', { name: 'Save changes' }))
    await screen.findByRole('heading', { name: 'Full chorus with block chords', level: 1 })
    await user.click(back())
    await waitFor(() => expect(router.state.location.pathname).toBe('/practice/piano-man'))
    expect(router.state.location.search).toBe('?goal=piano-man-g4')
  })

  it('returns to the practice session after the goal is deleted', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/practice/piano-man?goal=piano-man-g4')
    await user.click(await screen.findByRole('link', { name: 'Log attempt' }))
    await user.click(await screen.findByRole('link', { name: 'Edit goal' }))
    await user.click(await screen.findByRole('button', { name: 'Delete goal' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete goal' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/practice/piano-man'))
    expect(await repos.goals.get('piano-man-g4')).toBeUndefined()
    // The deleted goal is no longer in the address's goal, so practice picks another.
    expect(await screen.findByRole('timer', { name: 'Practice time' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('still goes to the Goals list after deleting a goal opened from there', async () => {
    await loadSamples()
    const user = userEvent.setup()
    const { router } = renderApp('/songs/piano-man/goals/piano-man-g4/edit')
    await user.click(await screen.findByRole('button', { name: 'Delete goal' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete goal' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/songs/piano-man/goals'))
  })
})
