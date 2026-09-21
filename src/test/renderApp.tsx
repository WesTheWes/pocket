import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/routes'

/** Renders the real route table at `path`, using the app's repositories (fake IndexedDB in tests). */
export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return { router, ...render(<RouterProvider router={router} />) }
}
