import { Link } from 'react-router'
import { Icon } from '../../components/Icon'
import { ProgressBar } from '../../components/ProgressBar'
import { currentLevel, levelCount, songLevels } from '../../domain/levels'
import {
  goalDone,
  goalLocked,
  goalProgress,
  goalStats,
  lockReason,
  toPercent,
} from '../../domain/progress'
import type { Attempt, Goal, Section, Song } from '../../domain/schemas'
import { goalReason, startGoal } from '../../domain/suggest'
import { cn } from '../../lib/cn'
import { paths } from '../../paths'

/**
 * The song as levels: goals grouped by how deep they sit in the "finish first" graph, on a rail
 * with done, current, open and locked nodes, the current goal expanded with a Start button.
 */
export function SongPath({
  song,
  sections,
  goals,
  attempts,
}: {
  song: Song
  sections: Section[]
  goals: Goal[]
  attempts: Attempt[]
}) {
  if (goals.length === 0) {
    return (
      <p className="text-sm text-muted">
        Add goals, and say which to finish first, and the path through the song appears here.
      </p>
    )
  }
  const levels = songLevels(goals, sections)
  const level = currentLevel(goals, attempts)
  const count = levelCount(goals)
  const stats = goalStats(goals, attempts)
  const current = startGoal(goals, sections, attempts)
  const sectionName = (id: string | null) =>
    id === null ? 'Whole song' : (sections.find((section) => section.id === id)?.name ?? '')

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-muted desk:text-sm">
          Level {level} of {count} · {stats.doneCount} of {stats.goalCount}{' '}
          {stats.goalCount === 1 ? 'goal' : 'goals'} done
        </span>
        <span className="text-[13px] font-semibold tabular-nums desk:text-sm">
          {toPercent(stats.progress)}%
        </span>
      </div>
      <ol aria-label="Levels" className="mt-2 flex gap-1">
        {levels.map((entry) => {
          const done = entry.goals.filter((goal) => goalDone(goal, attempts)).length
          const fill = done / entry.goals.length
          return (
            <li
              key={entry.level}
              aria-label={`Level ${entry.level}: ${done} of ${entry.goals.length} done`}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
            >
              <div
                className={cn('h-full rounded-full', fill === 1 ? 'bg-yellow' : 'bg-orange')}
                style={{ width: `${fill * 100}%` }}
              />
            </li>
          )
        })}
      </ol>

      <ol aria-label="The path through the song" className="mt-5">
        {levels.map((entry, index) => {
          const done = entry.goals.filter((goal) => goalDone(goal, attempts)).length
          const complete = done === entry.goals.length
          const locked = entry.goals.every(
            (goal) => goalDone(goal, attempts) === false && goalLocked(goal, goals, attempts),
          )
          const here = entry.level === level
          const last = index === levels.length - 1
          return (
            <li key={entry.level} className="flex gap-3.5">
              <div className="flex w-7 shrink-0 flex-col items-center">
                {complete ? (
                  <span aria-hidden="true" className="mt-1 size-5 rounded-full bg-yellow" />
                ) : here ? (
                  <span
                    aria-hidden="true"
                    className="flex size-7 items-center justify-center rounded-full bg-orange text-ink ring-2 ring-orange ring-offset-4 ring-offset-canvas"
                  >
                    <Icon name="play" size={14} />
                  </span>
                ) : locked ? (
                  <span
                    aria-hidden="true"
                    className="mt-1 flex size-5 items-center justify-center rounded-full bg-surface-2 text-muted"
                  >
                    <Icon name="lock" size={11} />
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="mt-1 size-5 rounded-full border-2 border-yellow"
                  />
                )}
                {!last && (
                  <span
                    aria-hidden="true"
                    className={cn('mt-1.5 w-0.5 flex-1', complete ? 'bg-yellow' : 'bg-line')}
                  />
                )}
              </div>
              <div className={cn('min-w-0 flex-1', !last && 'pb-3.5')}>
                <div className="flex h-7 items-baseline justify-between">
                  <h3
                    className={cn(
                      'text-xs font-semibold uppercase tracking-[0.08em]',
                      here ? 'text-orange' : complete ? 'text-yellow' : 'text-muted',
                    )}
                  >
                    Level {entry.level}
                    {here && ' · You are here'}
                  </h3>
                  <span className="text-xs text-muted">
                    {locked ? 'locked' : `${done} of ${entry.goals.length} done`}
                  </span>
                </div>
                <ul className="mt-1 flex flex-col gap-1.5">
                  {entry.goals.map((goal) => (
                    <PathGoal
                      key={goal.id}
                      goal={goal}
                      song={song}
                      goals={goals}
                      attempts={attempts}
                      sectionName={sectionName(goal.sectionId)}
                      current={goal.id === current?.id}
                    />
                  ))}
                </ul>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function PathGoal({
  goal,
  song,
  goals,
  attempts,
  sectionName,
  current,
}: {
  goal: Goal
  song: Song
  goals: Goal[]
  attempts: Attempt[]
  sectionName: string
  current: boolean
}) {
  const to = paths.goal(song.id, goal.id)
  if (goalDone(goal, attempts)) {
    return (
      <li>
        <Link
          to={to}
          className="flex h-11 items-center gap-2.5 rounded-row bg-surface px-3 text-sm text-muted"
        >
          <span className="text-yellow">
            <Icon name="check" size={16} />
          </span>
          <span className="min-w-0 flex-1 truncate">{goal.title}</span>
          <span className="shrink-0 text-xs">{sectionName}</span>
        </Link>
      </li>
    )
  }
  const locked = lockReason(goal, goals, attempts)
  if (locked) {
    return (
      <li>
        <Link
          to={to}
          className="flex min-h-11 items-start gap-2.5 rounded-row border border-dashed border-line px-3 py-1.5 text-sm text-muted"
        >
          <span className="mt-0.5 shrink-0">
            <Icon name="lock" size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-cream">{goal.title}</span>
            <span className="block text-xs">{locked}</span>
          </span>
        </Link>
      </li>
    )
  }
  if (current) {
    return (
      <li className="rounded-row bg-surface p-3.5 outline outline-[1.5px] -outline-offset-[1.5px] outline-orange">
        <div className="text-xs text-muted">{sectionName}</div>
        <Link to={to} className="mt-0.5 block text-[17px] font-medium leading-[1.25]">
          {goal.title}
        </Link>
        <div className="mt-2.5">
          <ProgressBar
            value={goalProgress(goal, attempts)}
            label={`${goal.title} progress`}
            size="sm"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[13px] text-muted">
            {goalReason(goal, attempts)}
          </span>
          <Link
            to={paths.practice(song.id, goal.id)}
            aria-label={`Start ${goal.title}`}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-orange px-3.5 text-[13px] font-semibold text-ink"
          >
            <Icon name="play" size={14} />
            Start
          </Link>
        </div>
      </li>
    )
  }
  const tried = attempts.some((attempt) => attempt.goalId === goal.id)
  return (
    <li>
      <Link to={to} className="flex h-11 items-center gap-2.5 rounded-row bg-surface px-3 text-sm">
        <span aria-hidden="true" className="size-4 shrink-0 rounded-full border-2 border-yellow" />
        <span className="min-w-0 flex-1 truncate">{goal.title}</span>
        <span
          className={cn('shrink-0 text-xs', tried ? 'text-muted' : 'font-semibold text-yellow')}
        >
          {tried ? `${toPercent(goalProgress(goal, attempts))}%` : 'new'}
        </span>
      </Link>
    </li>
  )
}
