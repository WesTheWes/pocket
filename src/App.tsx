import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './app/routes'

// Matches vite.config.ts's `base`: '/' locally, '/pocket/' on GitHub Pages. Kept in sync
// automatically, since both read from the same Vite-resolved value rather than being set twice.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

const router = createBrowserRouter(routes, { basename })

export default function App() {
  return <RouterProvider router={router} />
}
