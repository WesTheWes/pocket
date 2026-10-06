import { useParams } from 'react-router'
import { ButtonLink } from '../../components/Button'
import { Icon, type IconName } from '../../components/Icon'
import { IconLink } from '../../components/IconButton'
import { MissingPage } from '../../components/MissingPage'
import { Page } from '../../components/Page'
import { ProgressHistoryChart } from '../../components/ProgressHistoryChart'
import {
  useAllSessions,
  useGoals,
  useSections,
  useSession,
  useSessions,
  useSong,
  useSongAttempts,
} from '../../data/hooks'
import {
  BeforeAfterLegend,
  ProgressChange,
  ProgressChangeList,
} from '../../components/ProgressChange'
import { openedInSession, sessionFirsts, type First } from '../../domain/firsts'
import { progressHistory } from '../../domain/history'
import { suggestGoal } from '../../domain/suggest'
import { withReturn } from '../../lib/returnTo'
import { orderGoals } from '../../domain/progress'
import { sessionChanges, songProgressChange } from '../../domain/session'
import { formatDuration } from '../../lib/formatDuration'
import { plural } from '../../lib/plural'
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
  const sessions = useSessions(songId)
  const allSessions = useAllSessions()
  const elapsed = useSessionTimer(session)

  // Still loading from IndexedDB.
  if (
    song === undefined ||
    !sections ||
    !goals ||
    !attempts ||
    session === undefined ||
    !sessions ||
    !allSessions
  ) {
    return <Page />
  }
  if (song === null) return <SongNotFound />
  if (session === null || session.songId !== song.id) {
    return <MissingPage title="Session not found" backTo={paths.song(song.id)} />
  }

  const changes = sessionChanges(session, orderGoals(goals, sections), attempts)
  const songChange = songProgressChange(session, goals, attempts)
  const improved = changes.filter((change) => change.improved).length
  const history = progressHistory(goals, attempts, sessions)
  const sessionCount = history.length - 1
  const firsts = sessionFirsts(session, goals, attempts, allSessions)
  const opened = openedInSession(session, goals, attempts).length
  const nextTime = suggestGoal([song], sections, goals, attempts, allSessions)
  const sectionName = (sectionId: string | null) =>
    sections.find((section) => section.id === sectionId)?.name ?? 'Whole song'

  return (
    <Page wide>
      <div className="flex h-[60px] items-center px-2 pt-2 desk:h-auto desk:px-[68px] desk:pt-7">
        <IconLink
          to={paths.home}
          icon="close"
          label="Close"
          className="desk:border desk:border-line"
        />
      </div>

      <div className="flex flex-1 flex-col desk:grid desk:grid-cols-[5fr_7fr] desk:items-start desk:gap-x-16 desk:px-15 desk:pb-16 desk:pt-3">
        <div>
          <div className="px-5 pt-2">
            <div className="eyebrow">Practice complete</div>
            <div className="mt-2.5 font-display text-[64px] leading-none tabular-nums desk:text-[96px]">
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
            {opened > 0 && (
              <div>
                <dd className="text-[26px] font-semibold leading-[1.1]">{opened}</dd>
                <dt className="mt-0.5 text-xs text-muted">Unlocked</dt>
              </div>
            )}
          </dl>

          {firsts.length > 0 && (
            <section className="px-5 pt-7" aria-labelledby="firsts-heading">
              <h2 id="firsts-heading" className="eyebrow flex h-11 items-center">
                Today’s firsts
              </h2>
              <ul className="grid grid-cols-2 gap-2.5">
                {firsts.map((first) => (
                  <FirstCard key={`${first.kind}-${first.detail}`} first={first} />
                ))}
              </ul>
            </section>
          )}

          {history.length > 1 && (
            <section className="px-5 pt-7" aria-labelledby="over-time-heading">
              <div className="flex h-11 items-center justify-between">
                <h2 id="over-time-heading" className="eyebrow">
                  Over time
                </h2>
                <span className="text-xs text-muted">{plural(sessionCount, 'session')}</span>
              </div>
              <div className="rounded-card bg-surface px-4 pb-2 pt-4">
                <ProgressHistoryChart
                  points={history}
                  highlightId={session.id}
                  now={session.startedAt}
                />
              </div>
            </section>
          )}
        </div>

        <div className="desk:row-span-2">
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
                No attempts were logged in this session. Log attempts on a goal while you practice
                to see how you improved.
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

          {nextTime && (
            <section className="px-5 pt-7" aria-labelledby="next-time-heading">
              <h2 id="next-time-heading" className="eyebrow flex h-11 items-center">
                Next time, start with
              </h2>
              <div className="flex items-center gap-3 rounded-card bg-surface py-3.5 pl-[18px] pr-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-muted">
                    {sectionName(nextTime.goal.sectionId)} · {nextTime.reason}
                  </div>
                  <div className="mt-0.5 font-display text-[22px] leading-[1.15]">
                    {nextTime.goal.title}
                  </div>
                  <div className="mt-1 text-[13px] text-muted">{nextTime.step.text}</div>
                </div>
                <IconLink
                  to={paths.practice(song.id, nextTime.goal.id)}
                  state={withReturn(paths.review(song.id, session.id), { bpm: nextTime.step.bpm })}
                  icon="play"
                  variant="tonal"
                  label={`Start ${nextTime.goal.title}`}
                />
              </div>
            </section>
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2.5 px-5 pb-10 pt-8 desk:col-start-1 desk:pb-0">
          <ButtonLink to={paths.practice(song.id)} variant="secondary">
            Practice again
          </ButtonLink>
          <ButtonLink to={paths.home} icon="check">
            Done
          </ButtonLink>
        </div>
      </div>
    </Page>
  )
}

const FIRST_ICONS: Record<First['kind'], { icon: IconName; className: string }> = {
  done: { icon: 'check', className: 'bg-yellow text-ink' },
  fastest: { icon: 'up', className: 'bg-orange text-ink' },
  level: { icon: 'lock', className: 'bg-surface-2 text-yellow' },
  longest: { icon: 'chart', className: 'bg-surface-2 text-cream' },
  streak: { icon: 'sparkle', className: 'bg-surface-2 text-orange' },
}

/** One thing this session was the first to do. */
function FirstCard({ first }: { first: First }) {
  const { icon, className } = FIRST_ICONS[first.kind]
  return (
    <li className="flex flex-col gap-2 rounded-card bg-surface p-4">
      <span className={`flex size-8 items-center justify-center rounded-full ${className}`}>
        <Icon name={icon} size={16} />
      </span>
      <div className="text-[15px] font-semibold leading-[1.3]">{first.title}</div>
      <div className="text-[13px] leading-[1.4] text-muted">{first.detail}</div>
    </li>
  )
}
