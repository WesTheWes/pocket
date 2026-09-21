import type { RouteObject } from 'react-router'
import { HomeScreen } from '../features/repertoire/HomeScreen'
import { EditSongScreen } from '../features/songs/EditSongScreen'
import { NewSongScreen } from '../features/songs/NewSongScreen'
import { EditSectionScreen } from '../features/songs/EditSectionScreen'
import { NewSectionScreen } from '../features/songs/NewSectionScreen'
import { EditGoalScreen } from '../features/goals/EditGoalScreen'
import { GoalProgressScreen } from '../features/goals/GoalProgressScreen'
import { GoalsScreen } from '../features/goals/GoalsScreen'
import { NewGoalScreen } from '../features/goals/NewGoalScreen'
import { SongScreen } from '../features/songs/SongScreen'
import { StructureScreen } from '../features/structure/StructureScreen'
import { ComingSoon, NotFoundScreen } from './ComingSoon'

/**
 * The route table from docs/design/SCREENS.md. Screens not built yet render a placeholder;
 * replace the `ComingSoon` element as each one lands.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <HomeScreen /> },
  { path: '/songs/new', element: <NewSongScreen /> },
  { path: '/songs/:songId', element: <SongScreen /> },
  { path: '/songs/:songId/edit', element: <EditSongScreen /> },
  { path: '/songs/:songId/sections/new', element: <NewSectionScreen /> },
  { path: '/songs/:songId/sections/:sectionId', element: <EditSectionScreen /> },
  { path: '/songs/:songId/structure', element: <StructureScreen /> },
  { path: '/songs/:songId/goals', element: <GoalsScreen /> },
  { path: '/songs/:songId/goals/new', element: <NewGoalScreen /> },
  { path: '/songs/:songId/goals/:goalId', element: <GoalProgressScreen /> },
  { path: '/songs/:songId/goals/:goalId/edit', element: <EditGoalScreen /> },
  { path: '/practice/:songId', element: <ComingSoon screen="Practice" /> },
  {
    path: '/practice/:songId/review/:sessionId',
    element: <ComingSoon screen="Practice review" />,
  },
  { path: '*', element: <NotFoundScreen /> },
]
