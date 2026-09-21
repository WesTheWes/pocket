import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Stepper } from './Stepper'

function Harness({ initial }: { initial: number | null }) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <>
      <Stepper
        label="Target tempo"
        value={value}
        onChange={setValue}
        noneLabel="No target tempo"
        fallback={80}
      />
      <output data-testid="value">{value === null ? 'none' : value}</output>
    </>
  )
}

const value = () => screen.getByTestId('value').textContent
const input = () => screen.getByRole('textbox', { name: 'Target tempo, in BPM' })

describe('Stepper', () => {
  it('shows the tempo and steps it by one', async () => {
    const user = userEvent.setup()
    render(<Harness initial={84} />)
    expect(input()).toHaveValue('84')
    await user.click(screen.getByRole('button', { name: 'Increase tempo' }))
    await user.click(screen.getByRole('button', { name: 'Increase tempo' }))
    await user.click(screen.getByRole('button', { name: 'Decrease tempo' }))
    expect(value()).toBe('85')
    expect(input()).toHaveValue('85')
  })

  it('stops at 30 and 240', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Harness initial={30} />)
    expect(screen.getByRole('button', { name: 'Decrease tempo' })).toBeDisabled()
    unmount()
    render(<Harness initial={240} />)
    expect(screen.getByRole('button', { name: 'Increase tempo' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Decrease tempo' }))
    expect(value()).toBe('239')
  })

  it('lets you type a tempo, applied when you leave the field', async () => {
    const user = userEvent.setup()
    render(<Harness initial={84} />)
    await user.clear(input())
    await user.type(input(), '120')
    expect(value()).toBe('84') // not applied mid-typing
    await user.tab()
    expect(value()).toBe('120')
    expect(input()).toHaveValue('120')
  })

  it('applies a typed tempo on Enter', async () => {
    const user = userEvent.setup()
    render(<Harness initial={84} />)
    await user.clear(input())
    await user.type(input(), '96{Enter}')
    expect(value()).toBe('96')
  })

  it('keeps a typed tempo inside 30 to 240', async () => {
    const user = userEvent.setup()
    render(<Harness initial={84} />)
    await user.clear(input())
    await user.type(input(), '999')
    await user.tab()
    expect(value()).toBe('240')
    await user.clear(input())
    await user.type(input(), '5')
    await user.tab()
    expect(value()).toBe('30')
  })

  it('ignores letters and reverts when nothing valid was typed', async () => {
    const user = userEvent.setup()
    render(<Harness initial={84} />)
    await user.clear(input())
    await user.type(input(), 'abc')
    await user.tab()
    expect(value()).toBe('84')
    expect(input()).toHaveValue('84')
  })

  it('clears the tempo with the checkbox, and brings back the same one', async () => {
    const user = userEvent.setup()
    render(<Harness initial={96} />)
    await user.click(screen.getByRole('checkbox', { name: 'No target tempo' }))
    expect(value()).toBe('none')
    expect(input()).toBeDisabled()
    expect(input()).toHaveValue('—')
    expect(screen.getByRole('button', { name: 'Increase tempo' })).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: 'No target tempo' }))
    expect(value()).toBe('96')
  })

  it('starts from the fallback when there was never a tempo', async () => {
    const user = userEvent.setup()
    render(<Harness initial={null} />)
    expect(screen.getByRole('checkbox', { name: 'No target tempo' })).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'No target tempo' }))
    expect(value()).toBe('80')
  })
})
