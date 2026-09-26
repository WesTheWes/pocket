import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Page } from '../../components/Page'
import { ProgressBar } from '../../components/ProgressBar'
import {
  BeforeAfterLegend,
  ProgressChange,
  ProgressChangeList,
} from '../../components/ProgressChange'
import { TopBar } from '../../components/TopBar'
import {
  useAllAttempts,
  useAllGoals,
  useAllSections,
  useAllSessions,
  useSongs,
} from '../../data/hooks'
import { doneCount, toPercent } from '../../domain/progress'
import { practiceTimeSince, recentImprovements } from '../../domain/stats'
import { formatTimeAgo } from '../../lib/formatDate'
import { formatDuration } from '../../lib/formatDuration'
import { plural } from '../../lib/plural'
import { paths } from '../../paths'
import { sortSummaries, summarizeSongs, type SongSummary } from '../repertoire/summaries'

const DAY = 24 * 60 * 60 * 1000

/** "Improved lately" looks back this far and shows at most this many rows. */
const LATELY = { days: 30, limit: 10 }

export function StatsScreen() {
  const songs = useSongs()
  const sections = useAllSections()
  const goals = useAllGoals()
  const attempts = useAllAttempts()
  const sessions = useAllSessions()
  // Read once: the numbers here are a snapshot, not a ticking clock.
  const [now] = useState(() => Date.now())

  const stats = useMemo(() => {
    if (!songs || !sections || !goals || !attempts || !sessions) return null
    return {
      summaries: sortSummaries(summarizeSongs(songs, sections, goals, attempts), 'recent'),
      goalsDone: doneCount(goals, attempts),
      weekMs: practiceTimeSince(sessions, now - 7 * DAY, now),
      improvements: recentImprovements(sessions, goals, attempts, now, LATELY),
    }
  }, [songs, sections, goals, attempts, sessions, now])

  // Still loading from IndexedDB.
  if (!stats || !songs || !sections) return <Page />

  const songTitle = (songId: string) => songs.find((song) => song.id === songId)?.title ?? ''
  const sectionName = (sectionId: string | null) =>
    sections.find((section) => section.id === sectionId)?.name ?? 'Whole song'

  return (
    <Page>
      <TopBar backTo={paths.home} />

      <div className="px-5 pt-2">
        <h1 className="font-display text-[44px] leading-none">Stats</h1>
        <p className="mt-2 text-[17px] text-muted">Your practice, at a glance</p>
      </div>

      <dl className="flex gap-10 px-5 pt-7">
        <Figure value={String(songs.length)} label={songs.length === 1 ? 'Song' : 'Songs'} />
        <Figure value={String(stats.goalsDone)} label="Goals done" />
        <Figure value={formatDuration(stats.weekMs)} label="This week" />
      </dl>

      <section className="px-5 pt-9" aria-labelledby="improved-heading">
        <div className="flex h-11 items-center justify-between">
          <h2 id="improved-heading" className="eyebrow">
            Improved lately
          </h2>
          {stats.improvements.length > 0 && <BeforeAfterLegend />}
        </div>
        {stats.improvements.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing yet in the last {LATELY.days} days. Log attempts while you practice and the
            goals you move forward will show up here.
          </p>
        ) : (
          <ProgressChangeList label="Goals improved lately">
            {stats.improvements.map((improvement) => (
              <ProgressChange
                key={`${improvement.session.id}-${improvement.goal.id}`}
                eyebrow={`${songTitle(improvement.goal.songId)} · ${sectionName(improvement.goal.sectionId)}`}
                title={improvement.goal.title}
                before={improvement.progressBefore}
                after={improvement.progressAfter}
                aside={formatTimeAgo(improvement.at, now)}
              />
            ))}
          </ProgressChangeList>
        )}
      </section>

      <section className="px-5 pb-16 pt-9" aria-labelledby="songs-heading">
        <div className="flex h-11 items-center justify-between">
          <h2 id="songs-heading" className="eyebrow">
            Your songs
          </h2>
          <span className="text-sm text-muted">{plural(songs.length, 'song')}</span>
        </div>
        {stats.summaries.length === 0 ? (
          <p className="text-sm text-muted">
            No songs yet.{' '}
            <Link to={paths.newSong} className="text-cream underline">
              Add one
            </Link>{' '}
            to start tracking it.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {stats.summaries.map((summary) => (
              <SongRow key={summary.song.id} summary={summary} />
            ))}
          </ul>
        )}
      </section>
    </Page>
  )
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-0.5 text-[13px] text-muted">{label}</dt>
      <dd className="text-[28px] font-semibold leading-[1.1] tabular-nums">{value}</dd>
    </div>
  )
}

function statusLabel({ status, lastPracticedAt }: SongSummary): string {
  if (status === 'learned') return 'Learned'
  return lastPracticedAt === null ? 'Not started' : 'In progress'
}

function SongRow({ summary }: { summary: SongSummary }) {
  const { song, progress, status } = summary
  return (
    <li>
      <Link to={paths.song(song.id)} className="block py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-[26px] leading-[1.1]">{song.title}</div>
            {song.artist && (
              <div className="mt-1 truncate text-[15px] text-muted">{song.artist}</div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[15px] font-semibold tabular-nums">{toPercent(progress)}%</div>
            <div
              className={
                status === 'learned'
                  ? 'text-[13px] font-semibold text-yellow'
                  : 'text-[13px] text-muted'
              }
            >
              {statusLabel(summary)}
            </div>
          </div>
        </div>
        <div className="mt-3.5">
          <ProgressBar value={progress} label={`${song.title} progress`} track="line" />
        </div>
      </Link>
    </li>
  )
}
