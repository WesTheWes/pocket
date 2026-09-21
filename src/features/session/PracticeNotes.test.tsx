import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { PracticeNotes } from './PracticeNotes'

afterEach(() => localStorage.clear())

const CHORDS = 'Intro    C G/B Am\nVerse    C G/B Am C/G\nChorus   F C/E Dm G7'
const props = { sectionName: 'Chorus', sectionNotes: 'Watch the pickup.', chordNotes: CHORDS }

describe('PracticeNotes', () => {
  it('shows nothing when there are no notes at all', () => {
    const { container } = render(<PracticeNotes sectionNotes="" chordNotes="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('treats notes of only spaces as no notes', () => {
    const { container } = render(
      <PracticeNotes sectionName="X" sectionNotes={'  \n '} chordNotes="   " />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the section’s notes first, open by default', () => {
    render(<PracticeNotes {...props} />)
    expect(screen.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('tab', { name: 'Chorus notes' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Watch the pickup.')
  })

  it('switches to the chord chart, keeping its spacing and line breaks', async () => {
    const user = userEvent.setup()
    render(<PracticeNotes {...props} />)
    await user.click(screen.getByRole('tab', { name: 'Chords' }))

    expect(screen.getByRole('tab', { name: 'Chords' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Chorus notes' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    const panel = screen.getByRole('tabpanel')
    expect(panel.textContent).toBe(CHORDS)
    expect(within(panel).queryByText('Watch the pickup.')).not.toBeInTheDocument()
  })

  it('never wraps the chord chart, so columns stay lined up', async () => {
    const user = userEvent.setup()
    render(<PracticeNotes {...props} />)
    await user.click(screen.getByRole('tab', { name: 'Chords' }))
    expect(screen.getByRole('tabpanel').firstElementChild).toHaveClass(
      'chord-notes',
      'whitespace-pre!',
    )
  })

  it('minimizes to a slim row that still says what is inside', async () => {
    const user = userEvent.setup()
    render(<PracticeNotes {...props} />)
    await user.click(screen.getByRole('button', { name: 'Notes' }))

    expect(screen.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByText('Chorus notes · Chords')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Notes' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Watch the pickup.')
  })

  it('remembers that you minimized it', async () => {
    const user = userEvent.setup()
    const first = render(<PracticeNotes {...props} />)
    await user.click(screen.getByRole('button', { name: 'Notes' }))
    first.unmount()

    render(<PracticeNotes {...props} />)
    expect(screen.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('offers only the chord chart when the section has no notes', () => {
    render(<PracticeNotes sectionName="Intro" sectionNotes="" chordNotes={CHORDS} />)
    expect(screen.getAllByRole('tab')).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Chords' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel').textContent).toBe(CHORDS)
  })

  it('offers only the section’s notes when the song has no chord chart', () => {
    render(<PracticeNotes sectionName="Verse" sectionNotes="Swing it." chordNotes="" />)
    expect(screen.getAllByRole('tab')).toHaveLength(1)
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Swing it.')
  })

  it('has no section tab for the whole song, only the chords', () => {
    render(<PracticeNotes sectionNotes="" chordNotes={CHORDS} />)
    expect(screen.queryByRole('tab', { name: /notes/ })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Chords' })).toBeInTheDocument()
  })

  it('stays on the chord chart when the section changes, and follows the new section’s notes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PracticeNotes {...props} />)
    await user.click(screen.getByRole('tab', { name: 'Chords' }))

    rerender(
      <PracticeNotes sectionName="Verse" sectionNotes="Left hand waltz." chordNotes={CHORDS} />,
    )
    expect(screen.getByRole('tab', { name: 'Chords' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Verse notes' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Left hand waltz.')
  })

  it('falls back to the chord chart if the section you were reading has no notes any more', async () => {
    const { rerender } = render(<PracticeNotes {...props} />)
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Watch the pickup.')

    rerender(<PracticeNotes sectionName="Intro" sectionNotes="" chordNotes={CHORDS} />)
    expect(screen.getByRole('tabpanel').textContent).toBe(CHORDS)
  })

  it('lets keyboard users scroll long notes', () => {
    render(<PracticeNotes {...props} />)
    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0')
  })
})
