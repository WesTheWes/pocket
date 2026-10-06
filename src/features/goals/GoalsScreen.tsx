import { useState } from 'react'
import { useParams } from 'react-router'
import { ButtonLink } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { GoalCard } from '../../components/GoalCard'
import { IconLink } from '../../components/IconButton'
import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { useGoals, useSections, useSong, useSongAttempts } from '../../data/hooks'
import { goalSummary } from '../../domain/goalSummary'
import { goalDone, goalProgress } from '../../domain/progress'
import { paths } from '../../paths'
import { SongNotFound } from '../songs/SongNotFound'
import { filterCounts, groupGoals, type GoalFilter } from './groups'

export function GoalsScreen() {
  const { songId = '' } = useParams()
  const song = useSong(songId)
  const sections = useSections(songId)
  const goals = useGoals(songId)
  const attempts = useSongAttempts(songId)
  const [filter, setFilter] = useState<GoalFilter>('all')

  // Still loading from IndexedDB.
  if (song === undefined || !sections || !goals || !attempts) return <Page />
  if (song === null) return <SongNotFound />

  const counts = filterCounts(goals, attempts)
  const groups = groupGoals(goals, sections, attempts, filter)
  const filters: Array<{ value: GoalFilter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'todo', label: 'To do', count: counts.todo },
    { value: 'done', label: 'Done', count: counts.done },
  ]

  return (
    <Page>
      <TopBar backTo={paths.song(song.id)} />
      <div className="px-5 pt-2">
        <h1 className="font-display text-[38px] leading-[1.05]">{song.title}</h1>
        <p className="mt-1 text-sm text-muted">Goals across the whole song and each section</p>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-start gap-3 px-5 pt-8">
          <p className="text-muted">
            No goals yet. A goal is something to work toward, like “Left hand alone at 80 BPM”.
          </p>
          <ButtonLink to={paths.newGoal(song.id)} icon="plus">
            Add a goal
          </ButtonLink>
        </div>
      ) : (
        <>
          <div className="flex gap-2 px-5 pt-3">
            {filters.map(({ value, label, count }) => (
              <Chip key={value} selected={filter === value} onClick={() => setFilter(value)}>
                {label} {count}
              </Chip>
            ))}
          </div>

          <div className="px-5 pb-10">
            {groups.map((group) => (
              <section key={group.key} aria-labelledby={`group-${group.key}`} className="mt-3">
                <div className="flex h-11 items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <h2 id={`group-${group.key}`} className="eyebrow">
                      {group.title}
                    </h2>
                    <span className="text-xs text-muted">{group.goals.length}</span>
                  </div>
                  <IconLink
                    to={paths.newGoal(song.id, group.sectionId ?? undefined)}
                    icon="plus"
                    label={`Add goal to ${group.title}`}
                    className="text-orange"
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  {group.goals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      to={paths.goal(song.id, goal.id)}
                      title={goal.title}
                      progress={goalProgress(goal, attempts)}
                      done={goalDone(goal, attempts)}
                      summary={goalSummary(goal, attempts)}
                      practiceTo={paths.practice(song.id, goal.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </Page>
  )
}
