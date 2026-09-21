import type { RouteObject } from 'react-router'
import { HomeScreen } from '../features/repertoire/HomeScreen'
import { SongScreen } from '../features/songs/SongScreen'
import { ComingSoon, NotFoundScreen } from './ComingSoon'

/**
 * The route table from docs/design/SCREENS.md. Screens not built yet render a placeholder;
 * replace the `ComingSoon` element as each one lands.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <HomeScreen /> },
  { path: '/songs/new', element: <ComingSoon screen="New song" /> },
  { path: '/songs/:songId', element: <SongScreen /> },
  { path: '/songs/:songId/edit', element: <ComingSoon screen="Edit song" /> },
  { path: '/songs/:songId/sections/new', element: <ComingSoon screen="New section" /> },
  { path: '/songs/:songId/sections/:sectionId', element: <ComingSoon screen="Edit section" /> },
  { path: '/songs/:songId/structure', element: <ComingSoon screen="Structure" /> },
  { path: '/songs/:songId/goals', element: <ComingSoon screen="Goals" /> },
  { path: '/songs/:songId/goals/new', element: <ComingSoon screen="New goal" /> },
  { path: '/songs/:songId/goals/:goalId', element: <ComingSoon screen="Goal progress" /> },
  { path: '/songs/:songId/goals/:goalId/edit', element: <ComingSoon screen="Edit goal" /> },
  { path: '/practice/:songId', element: <ComingSoon screen="Practice" /> },
  {
    path: '/practice/:songId/review/:sessionId',
    element: <ComingSoon screen="Practice review" />,
  },
  { path: '*', element: <NotFoundScreen /> },
]
