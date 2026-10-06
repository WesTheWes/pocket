import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/routes'

/**
 * Renders the real route table at `path`, using the app's repositories (fake IndexedDB in tests).
 * `state` arrives as the location state, as if a link had passed it.
 */
export function renderApp(path = '/', { state }: { state?: unknown } = {}) {
  const [pathname, search = ''] = path.split('?')
  const router = createMemoryRouter(routes, {
    initialEntries: [{ pathname, search: search && `?${search}`, state }],
  })
  return { router, ...render(<RouterProvider router={router} />) }
}
