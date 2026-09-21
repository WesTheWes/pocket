import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextAreaField } from './Field'

describe('TextAreaField sizing', () => {
  it('is tall and monospaced by default, for chord charts', () => {
    render(<TextAreaField label="Chords" />)
    const box = screen.getByRole('textbox', { name: 'Chords' })
    expect(box).toHaveClass('min-h-[230px]', 'font-mono')
  })

  it('uses the height and font a caller asks for, instead of stacking them on the defaults', () => {
    render(<TextAreaField label="Notes" className="min-h-[130px] font-sans text-base" />)
    const box = screen.getByRole('textbox', { name: 'Notes' })
    expect(box).toHaveClass('min-h-[130px]', 'font-sans')
    // Two conflicting min-heights or fonts would leave the browser to pick one.
    expect(box).not.toHaveClass('min-h-[230px]')
    expect(box).not.toHaveClass('font-mono')
  })
})
