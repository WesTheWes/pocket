import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { repos } from '../../data'
import { renderApp } from '../../test/renderApp'

afterEach(async () => {
  await repos.backup.clear()
})

const plan = {
  title: 'Autumn Leaves',
  artist: 'Joseph Kosma',
  tempo: 120,
  chordNotes: 'A  Cm7 F7 BbM7 EbM7',
  sections: [
    { name: 'A', notes: 'ii V I', goals: [{ title: 'A, shells', targetBpm: 80 }] },
    { name: 'B', goals: [{ title: 'B, shells', targetBpm: 80, requires: ['A, shells'] }] },
  ],
  structure: ['A', 'A', 'B', 'A'],
  goals: [{ title: 'Play it through', targetBpm: 120, requires: ['B, shells'] }],
  resources: [{ label: 'Recording', url: 'https://example.com/rec', kind: 'video' }],
}

const replyBox = () => screen.getByRole('textbox', { name: 'Paste the reply' })

describe('PlanSongScreen', () => {
  it('builds a prompt from the description and copies it', async () => {
    // userEvent.setup() installs a working clipboard stub, so the copy can be read back.
    const user = userEvent.setup()
    renderApp('/songs/plan')
    await screen.findByRole('heading', { name: 'Plan a song', level: 1 })
    expect(screen.getByRole('button', { name: 'Copy prompt' })).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Autumn Leaves')
    await user.type(screen.getByRole('textbox', { name: 'Artist' }), 'Joseph Kosma')
    await user.type(
      screen.getByRole('textbox', { name: 'What are you learning it for?' }),
      'comping in a jazz trio',
    )
    await user.click(screen.getByRole('button', { name: 'Advanced' }))
    await user.click(screen.getByRole('button', { name: 'Copy prompt' }))

    const prompt = await navigator.clipboard.readText()
    expect(prompt).toContain('Song: Autumn Leaves by Joseph Kosma')
    expect(prompt).toContain('comping in a jazz trio')
    expect(prompt).toContain('My level: advanced')
    expect(await screen.findByText('Prompt copied')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue(prompt)
  })

  it('says what is wrong with a reply, and shows nothing to create', async () => {
    renderApp('/songs/plan')
    await screen.findByRole('heading', { name: 'Plan a song', level: 1 })
    fireEvent.change(replyBox(), { target: { value: 'Sure! Here is a plan.' } })
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid JSON/)
    expect(screen.queryByRole('button', { name: 'Create song' })).not.toBeInTheDocument()

    fireEvent.change(replyBox(), {
      target: { value: JSON.stringify({ ...plan, structure: ['A', 'Solo'] }) },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('“Solo”')
  })

  it('previews the plan and creates the song with everything in it', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/songs/plan')
    await screen.findByRole('heading', { name: 'Plan a song', level: 1 })
    fireEvent.change(replyBox(), {
      target: { value: 'Here you go:\n```json\n' + JSON.stringify(plan) + '\n```' },
    })

    const preview = within(await screen.findByRole('region', { name: 'Plan preview' }))
    expect(preview.getByText('Autumn Leaves')).toBeInTheDocument()
    expect(preview.getByText('Joseph Kosma · 120 BPM')).toBeInTheDocument()
    const sections = within(preview.getByRole('list', { name: 'Planned sections' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(sections).toEqual(['A1 goal · notes', 'B1 goal'])
    expect(
      within(preview.getByRole('list', { name: 'Planned play order' })).getAllByRole('listitem'),
    ).toHaveLength(4)
    const goals = within(preview.getByRole('list', { name: 'Planned goals' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(goals).toEqual([
      'Play it through120 BPMWhole song · after B, shells',
      'A, shells80 BPMA',
      'B, shells80 BPMB · after A, shells',
    ])
    expect(preview.getByText('Chord chart included · 1 link')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create song' }))
    await screen.findByRole('heading', { name: 'Autumn Leaves', level: 1 })
    expect(router.state.location.pathname).toMatch(/^\/songs\/[^/]+$/)
    const songs = await repos.songs.list()
    expect(songs).toHaveLength(1)
    expect(songs[0].resources).toEqual(plan.resources)
    expect(await repos.sections.listBySong(songs[0].id)).toHaveLength(2)
    expect(await repos.goals.listBySong(songs[0].id)).toHaveLength(3)
    await waitFor(() => expect(screen.getByText('Added Autumn Leaves')).toBeInTheDocument())
  })
})
