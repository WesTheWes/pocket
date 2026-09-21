import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button, ButtonLink } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Icon } from '../../components/Icon'
import { Page } from '../../components/Page'
import { SongCard } from '../../components/SongCard'
import { useAllAttempts, useAllGoals, useAllSections, useSongs } from '../../data/hooks'
import { paths } from '../../paths'
import { DevTools } from '../../app/DevTools'
import {
  filterSummaries,
  sortSummaries,
  summarizeSongs,
  type SortKey,
  type StatusFilter,
} from './summaries'

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'learned', label: 'Learned' },
]

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'recent', label: 'Recently practiced' },
  { value: 'title', label: 'Title' },
  { value: 'progress', label: 'Progress' },
]

export function HomeScreen() {
  const songs = useSongs()
  const sections = useAllSections()
  const goals = useAllGoals()
  const attempts = useAllAttempts()

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('recent')

  const summaries = useMemo(
    () =>
      songs && sections && goals && attempts
        ? summarizeSongs(songs, sections, goals, attempts)
        : null,
    [songs, sections, goals, attempts],
  )

  // Still loading from IndexedDB.
  if (!summaries) return <Page wide />

  const visible = sortSummaries(filterSummaries(summaries, { query, filter }), sort)

  return (
    <Page wide>
      <header className="px-5 pt-7 desk:flex desk:items-center desk:justify-between desk:px-20 desk:pt-11">
        <h1 className="font-display text-[40px] leading-none desk:text-5xl">Pocket</h1>
        <div className="mt-5 desk:mt-0 desk:flex desk:items-center desk:gap-3">
          <label className="flex h-[52px] items-center gap-2.5 rounded-full border border-line bg-surface px-4 text-muted desk:w-[360px]">
            <Icon name="search" size={20} />
            <input
              type="search"
              aria-label="Search songs"
              placeholder="Search songs or artists"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-base text-cream outline-0"
            />
          </label>
          <div className="hidden desk:block">
            <ButtonLink to={paths.newSong} icon="plus">
              New song
            </ButtonLink>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between px-5 pt-2 desk:px-20 desk:pt-8">
        <div className="flex gap-2">
          {FILTERS.map(({ value, label }) => (
            <Chip key={value} selected={filter === value} onClick={() => setFilter(value)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-5 desk:px-20">
        <div className="text-[13px] text-muted desk:text-sm">
          {visible.length} {visible.length === 1 ? 'song' : 'songs'}
        </div>
        <label className="relative flex h-11 items-center gap-1.5 px-1 text-[13px] font-medium desk:text-sm">
          <Icon name="sort" size={16} />
          {SORTS.find((option) => option.value === sort)?.label}
          <select
            aria-label="Sort songs"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {SORTS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex-1 px-5 pb-28 desk:px-20 desk:pb-16">
        {summaries.length === 0 ? (
          <EmptyState
            title="No songs yet"
            body="Add the first song you're learning to start tracking your progress."
          >
            <ButtonLink to={paths.newSong} icon="plus">
              New song
            </ButtonLink>
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState title="No songs match" body="Try a different search or filter.">
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('')
                setFilter('all')
              }}
            >
              Clear search and filter
            </Button>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2.5 desk:grid desk:grid-cols-3 desk:gap-5">
            {visible.map(({ song, progress, status, nextGoalId }) => (
              <SongCard
                key={song.id}
                title={song.title}
                artist={song.artist}
                progress={progress}
                learned={status === 'learned'}
                to={paths.song(song.id)}
                practiceTo={paths.practice(song.id, nextGoalId ?? undefined)}
              />
            ))}
            <Link
              to={paths.newSong}
              className="hidden min-h-[120px] items-center justify-center gap-2.5 rounded-card border border-dashed border-line font-semibold text-muted hover:text-cream desk:flex"
            >
              <Icon name="plus" size={20} />
              New song
            </Link>
          </div>
        )}
        <div className="mt-8 flex justify-center">
          <Link
            to={paths.backup}
            className="flex h-11 items-center gap-2 px-3 text-sm text-muted hover:text-cream"
          >
            <Icon name="download" size={16} />
            Back up & restore
          </Link>
        </div>
        <DevTools />
      </div>

      <div className="sticky bottom-6 px-5 pb-6 desk:hidden">
        <ButtonLink to={paths.newSong} icon="plus" className="w-full">
          New song
        </ButtonLink>
      </div>
    </Page>
  )
}

function EmptyState({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h2 className="font-display text-3xl">{title}</h2>
      <p className="max-w-xs text-sm text-muted">{body}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
