import { endSession, pauseSession, resumeSession } from '../domain/session'
import { sessionSchema, type Session } from '../domain/schemas'
import { RecordNotFoundError, type RepoContext } from './context'

export function createSessionsRepo({ db, now, newId }: RepoContext) {
  async function transition(id: string, change: (session: Session, at: number) => Session) {
    return db.transaction('rw', db.sessions, async () => {
      const current = await db.sessions.get(id)
      if (!current) throw new RecordNotFoundError('session', id)
      const next = sessionSchema.parse(change(current, now()))
      await db.sessions.put(next)
      return next
    })
  }

  return {
    get: (id: string) => db.sessions.get(id),

    listBySong: (songId: string) => db.sessions.where('songId').equals(songId).sortBy('startedAt'),

    /** The song's session that has not ended yet, if any. */
    getActive: (songId: string) =>
      db.sessions
        .where('songId')
        .equals(songId)
        .filter((session) => session.endedAt === null)
        .first(),

    /**
     * Returns the song's open session, or starts one. Atomic, so React StrictMode's doubled
     * effects and quick double taps cannot create two sessions.
     */
    async startOrResume(songId: string): Promise<Session> {
      return db.transaction('rw', [db.songs, db.sessions], async () => {
        if (!(await db.songs.get(songId))) throw new RecordNotFoundError('song', songId)
        const open = await db.sessions
          .where('songId')
          .equals(songId)
          .filter((session) => session.endedAt === null)
          .first()
        if (open) return open
        const session = sessionSchema.parse({
          id: newId(),
          songId,
          startedAt: now(),
          pausedMs: 0,
          pausedAt: null,
          endedAt: null,
        })
        await db.sessions.add(session)
        return session
      })
    },

    pause: (id: string) => transition(id, pauseSession),
    resume: (id: string) => transition(id, resumeSession),
    end: (id: string) => transition(id, endSession),
  }
}
