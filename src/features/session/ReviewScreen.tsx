import { useParams } from 'react-router'
import { ButtonLink } from '../../components/Button'
import { IconLink } from '../../components/IconButton'
import { MissingPage } from '../../components/MissingPage'
import { Page } from '../../components/Page'
import { useGoals, useSections, useSession, useSong, useSongAttempts } from '../../data/hooks'
import {
  BeforeAfterLegend,
  ProgressChange,
  ProgressChangeList,
} from '../../components/ProgressChange'
import { orderGoals } from '../../domain/progress'
import { sessionChanges, songProgressChange } from '../../domain/session'
import { formatDuration } from '../../lib/formatDuration'
import { paths } from '../../paths'
import { SongNotFound } from '../songs/SongNotFound'
import { useSessionTimer } from './useSessionTimer'
import { WorkedOnCard } from './WorkedOnCard'

export function ReviewScreen() {
  const { songId = '', sessionId = '' } = useParams()
  const song = useSong(songId)
  const sections = useSections(songId)
  const goals = useGoals(songId)
  const attempts = useSongAttempts(songId)
  const session = useSession(sessionId)
  const elapsed = useSessionTimer(session)

  // Still loading from IndexedDB.
  if (song === undefined || !sections || !goals || !attempts || session === undefined) {
    return <Page />
  }
  if (song === null) return <SongNotFound />
  if (session === null || session.songId !== song.id) {
    return <MissingPage title="Session not found" backTo={paths.song(song.id)} />
  }

  const changes = sessionChanges(session, orderGoals(goals, sections), attempts)
  const songChange = songProgressChange(session, goals, attempts)
  const improved = changes.filter((change) => change.improved).length
  const sectionName = (sectionId: string | null) =>
    sections.find((section) => section.id === sectionId)?.name ?? 'Whole song'

  return (
    <Page>
      <div className="flex h-[60px] items-center px-2 pt-2">
        <IconLink to={paths.home} icon="close" label="Close" />
      </div>

      <div className="px-5 pt-2">
        <div className="eyebrow">Practice complete</div>
        <div className="mt-2.5 font-display text-[64px] leading-none tabular-nums">
          {formatDuration(elapsed)}
        </div>
        <p className="mt-1.5 text-[15px] text-muted">
          {song.title}
          {song.artist && ` · ${song.artist}`}
        </p>
      </div>

      <dl className="flex gap-8 px-5 pt-[22px]">
        <div>
          <dd className="text-[26px] font-semibold leading-[1.1]">{changes.length}</dd>
          <dt className="mt-0.5 text-xs text-muted">Goals worked</dt>
        </div>
        <div>
          <dd className="text-[26px] font-semibold leading-[1.1]">{improved}</dd>
          <dt className="mt-0.5 text-xs text-muted">Improved</dt>
        </div>
      </dl>

      {changes.length > 0 && (
        <section className="px-5 pt-7" aria-labelledby="progress-heading">
          <div className="flex h-11 items-center justify-between">
            <h2 id="progress-heading" className="eyebrow">
              Progress
            </h2>
            <BeforeAfterLegend />
          </div>
          <ProgressChangeList label="Progress before and after this session">
            <ProgressChange
              eyebrow="Whole song"
              title="Overall progress · every goal"
              before={songChange.before}
              after={songChange.after}
            />
            {changes.map((change) => (
              <ProgressChange
                key={change.goal.id}
                eyebrow={sectionName(change.goal.sectionId)}
                title={change.goal.title}
                before={change.progressBefore}
                after={change.progressAfter}
              />
            ))}
          </ProgressChangeList>
        </section>
      )}

      <section className="px-5 pt-7" aria-labelledby="worked-on-heading">
        <div className="flex h-11 items-center">
          <h2 id="worked-on-heading" className="eyebrow">
            Worked on
          </h2>
        </div>
        {changes.length === 0 ? (
          <p className="text-sm text-muted">
            No attempts were logged in this session. Log attempts on a goal while you practice to
            see how you improved.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {changes.map((change) => (
              <WorkedOnCard
                key={change.goal.id}
                change={change}
                sectionName={sectionName(change.goal.sectionId)}
                songId={song.id}
                returnTo={paths.review(song.id, session.id)}
                sessionAt={session.startedAt}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="mt-auto grid grid-cols-2 gap-2.5 px-5 pb-10 pt-8">
        <ButtonLink to={paths.practice(song.id)} variant="secondary">
          Practice again
        </ButtonLink>
        <ButtonLink to={paths.home} icon="check">
          Done
        </ButtonLink>
      </div>
    </Page>
  )
}
