import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from './Toast'
import { useToast } from './toastContext'

function Trigger({ message }: { message: string }) {
  const { notify } = useToast()
  return <button onClick={() => notify(message)}>Notify {message}</button>
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => vi.useRealTimers())

describe('Toast', () => {
  it('shows a message as a polite status announcement', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <Trigger message="Attempt saved" />
      </ToastProvider>,
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Notify Attempt saved' }))
    expect(screen.getByRole('status')).toHaveTextContent('Attempt saved')
  })

  it('disappears by itself after a few seconds', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <Trigger message="Saved" />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button'))
    act(() => vi.advanceTimersByTime(2900))
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(200))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the newest message and gives it a full time on screen', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <Trigger message="First" />
        <Trigger message="Second" />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Notify First' }))
    act(() => vi.advanceTimersByTime(2000))
    await user.click(screen.getByRole('button', { name: 'Notify Second' }))
    expect(screen.getByRole('status')).toHaveTextContent('Second')
    expect(screen.getAllByRole('status')).toHaveLength(1)

    // The first message's timer would have ended by now; the second still has time left.
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByRole('status')).toHaveTextContent('Second')
    act(() => vi.advanceTimersByTime(1100))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('can be dismissed early', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <Trigger message="Saved" />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Notify Saved' }))
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('does not get in the way of what is underneath', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <ToastProvider>
        <Trigger message="Saved" />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Notify Saved' }))
    expect(screen.getByRole('status').parentElement).toHaveClass('pointer-events-none')
  })

  it('does nothing, without complaint, when there is no provider', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Trigger message="Saved" />)
    await user.click(screen.getByRole('button', { name: 'Notify Saved' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('stops its timer when the app goes away', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { unmount } = render(
      <ToastProvider>
        <Trigger message="Saved" />
      </ToastProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Notify Saved' }))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
