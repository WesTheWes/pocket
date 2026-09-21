import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { QualityLevel } from '../domain/quality'
import { QualityPicker } from './QualityPicker'

function Harness({ initial = null }: { initial?: QualityLevel | null }) {
  const [level, setLevel] = useState<QualityLevel | null>(initial)
  return (
    <>
      <QualityPicker label="How it felt" value={level} onChange={setLevel} />
      <output data-testid="level">{level ?? 'none'}</output>
    </>
  )
}

describe('QualityPicker', () => {
  it('offers the five levels by name, lowest first', () => {
    render(<Harness />)
    const group = screen.getByRole('radiogroup', { name: 'How it felt' })
    expect(group).toBeInTheDocument()
    expect(screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual([
      "Can't yet",
      'Rough',
      'Shaky',
      'Solid',
      'Mastered',
    ])
  })

  it('starts with nothing chosen', () => {
    render(<Harness />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
  })

  it('selects one level at a time', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('radio', { name: 'Solid' }))
    expect(screen.getByTestId('level')).toHaveTextContent('4')
    expect(screen.getByRole('radio', { name: 'Solid' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: "Can't yet" }))
    expect(screen.getByTestId('level')).toHaveTextContent('1')
    expect(screen.getByRole('radio', { name: 'Solid' })).not.toBeChecked()
  })

  it('shows the given level as selected', () => {
    render(<Harness initial={5} />)
    expect(screen.getByRole('radio', { name: 'Mastered' })).toBeChecked()
  })
})
