/** Every URL in the app. Build links with these instead of writing strings. */
export const paths = {
  home: '/',
  newSong: '/songs/new',
  song: (songId: string) => `/songs/${songId}`,
  editSong: (songId: string) => `/songs/${songId}/edit`,
  newSection: (songId: string) => `/songs/${songId}/sections/new`,
  section: (songId: string, sectionId: string) => `/songs/${songId}/sections/${sectionId}`,
  structure: (songId: string) => `/songs/${songId}/structure`,
  goals: (songId: string) => `/songs/${songId}/goals`,
  newGoal: (songId: string, sectionId?: string) =>
    `/songs/${songId}/goals/new${sectionId ? `?section=${sectionId}` : ''}`,
  goal: (songId: string, goalId: string) => `/songs/${songId}/goals/${goalId}`,
  editGoal: (songId: string, goalId: string) => `/songs/${songId}/goals/${goalId}/edit`,
  practice: (songId: string, goalId?: string) =>
    `/practice/${songId}${goalId ? `?goal=${goalId}` : ''}`,
  review: (songId: string, sessionId: string) => `/practice/${songId}/review/${sessionId}`,
} as const
