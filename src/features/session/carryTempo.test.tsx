import { fireEvent, screen } from '@testing-library/react'
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

const metronome = () => screen.getByRole('slider', { name: 'Tempo' })
const logTempo = () => screen.findByRole('textbox', { name: 'Tempo you played, in BPM' })

// "Full chorus with block chords": last logged tempo is 68.
const PRACTICE = '/practice/piano-man?goal=piano-man-g4'

describe('Log attempt from Practice carries the metronome tempo', () => {
  it('starts the log form at the tempo the metronome was set to', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(PRACTICE)
    await screen.findByRole('timer', { name: 'Practice time' })
    fireEvent.change(metronome(), { target: { value: '100' } })
    expect(metronome()).toHaveAttribute('aria-valuetext', '100 BPM')

    await user.click(screen.getByRole('link', { name: 'Log attempt' }))
    expect(await logTempo()).toHaveValue('100')
  })

  it('follows the buttons too, not only the slider', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(PRACTICE)
    await screen.findByRole('timer', { name: 'Practice time' })
    await user.click(screen.getByRole('button', { name: 'Faster' }))
    await user.click(screen.getByRole('button', { name: 'Faster' }))
    await user.click(screen.getByRole('button', { name: 'Faster' }))
    await user.click(screen.getByRole('link', { name: 'Log attempt' }))
    expect(await logTempo()).toHaveValue('71') // 68 + 3
  })

  it('still starts from the metronome tempo when it was left untouched', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(PRACTICE)
    await screen.findByRole('timer', { name: 'Practice time' })
    await user.click(screen.getByRole('link', { name: 'Log attempt' }))
    expect(await logTempo()).toHaveValue('68')
  })

  it('logs the attempt at that tempo', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(PRACTICE)
    await screen.findByRole('timer', { name: 'Practice time' })
    fireEvent.change(metronome(), { target: { value: '90' } })
    await user.click(screen.getByRole('link', { name: 'Log attempt' }))
    await user.click(await screen.findByRole('radio', { name: 'Solid' }))
    await user.click(screen.getByRole('button', { name: 'Save attempt' }))
    await screen.findByRole('status')

    const [latest] = await repos.attempts.listByGoal('piano-man-g4')
    expect(latest).toMatchObject({ bpm: 90, level: 4 })
  })

  it('brings the carried tempo back when "No tempo" is switched off again', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(PRACTICE)
    await screen.findByRole('timer', { name: 'Practice time' })
    fireEvent.change(metronome(), { target: { value: '100' } })
    await user.click(screen.getByRole('link', { name: 'Log attempt' }))
    await user.click(await screen.findByRole('checkbox', { name: 'No tempo' }))
    await user.click(screen.getByRole('checkbox', { name: 'No tempo' }))
    expect(await logTempo()).toHaveValue('100')
  })

  it('uses the tempo of whichever goal is showing when you tap Log attempt', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(PRACTICE)
    await screen.findByRole('timer', { name: 'Practice time' })
    fireEvent.change(metronome(), { target: { value: '100' } })
    await user.click(screen.getByRole('button', { name: 'Next goal' })) // the fill: last logged 42
    expect(metronome()).toHaveAttribute('aria-valuetext', '42 BPM')
    await user.click(screen.getByRole('link', { name: 'Log attempt' }))
    expect(await logTempo()).toHaveValue('42')
  })

  it('does not apply to a goal opened from somewhere else', async () => {
    await loadSamples()
    renderApp('/songs/piano-man/goals/piano-man-g4')
    expect(await logTempo()).toHaveValue('68') // last logged, as before
  })

  it('does not apply to a goal opened from the review', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp('/practice/piano-man/review/piano-man-session')
    await user.click(
      await screen.findByRole('link', { name: 'Edit progress for Walk-up fill into bar 5' }),
    )
    expect(await logTempo()).toHaveValue('42') // its last logged tempo
  })

  it('does not disturb editing an existing attempt', async () => {
    await loadSamples()
    const user = userEvent.setup()
    renderApp(PRACTICE)
    await screen.findByRole('timer', { name: 'Practice time' })
    fireEvent.change(metronome(), { target: { value: '100' } })
    await user.click(screen.getByRole('link', { name: 'Log attempt' }))
    await screen.findByRole('region', { name: 'History' })
    await user.click(screen.getAllByRole('button', { name: /^Edit attempt from/ })[2])
    expect(await logTempo()).toHaveValue('45') // the oldest attempt's own tempo
  })
})
