import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('starts on the Home screen', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Pocket' })).toBeInTheDocument()
  })
})
