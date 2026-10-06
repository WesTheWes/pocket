import { Fragment, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { AttemptRow } from '../../components/AttemptRow'
import { ConfirmSheet } from '../../components/BottomSheet'
import { ButtonLink } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { IconLink } from '../../components/IconButton'
import { Page } from '../../components/Page'
import { ProgressBar } from '../../components/ProgressBar'
import { ResourceLinks } from '../../components/ResourceLinks'
import { useToast } from '../../components/toastContext'
import { TopBar } from '../../components/TopBar'
import { repos } from '../../data'
import {
  useGoal,
  useGoalAttempts,
  useGoals,
  useSections,
  useSong,
  useSongAttempts,
} from '../../data/hooks'
import { goalSummary } from '../../domain/goalSummary'
import { blockingGoals, goalDone, goalProgress } from '../../domain/progress'
import { QUALITY_LABELS } from '../../domain/quality'
import type { Attempt } from '../../domain/schemas'
import { formatAttemptDate } from '../../lib/formatDate'
import { practiceReturn, returnTarget, tempoFrom, withReturn } from '../../lib/returnTo'
import { paths } from '../../paths'
import { UnlockSheet } from '../session/UnlockSheet'
import { SongNotFound } from '../songs/SongNotFound'
import { AttemptForm } from './AttemptForm'
import { GoalNotFound } from './GoalNotFound'

export function GoalProgressScreen() {
  const { songId = '', goalId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { notify } = useToast()
  const song = useSong(songId)
  const sections = useSections(songId)
  const goal = useGoal(goalId)
  const attempts = useGoalAttempts(goalId)
  const goals = useGoals(songId)
  const songAttempts = useSongAttempts(songId)

  const [editing, setEditing] = useState<Attempt>()
  const [removing, setRemoving] = useState<Attempt>()
  const [removeError, setRemoveError] = useState<string>()
  const [celebrating, setCelebrating] = useState(false)
  const [now] = useState(() => Date.now())

  // Still loading from IndexedDB.
  if (song === undefined || !sections || goal === undefined || !attempts || !goals || !songAttempts)
    return <Page />
  if (song === null) return <SongNotFound />
  if (goal === null || goal.songId !== song.id) return <GoalNotFound songId={song.id} />

  const sectionName = sections.find((section) => section.id === goal.sectionId)?.name
  const done = goalDone(goal, attempts)
  // The goals this one asks you to finish first, while they (and it) are not done.
  const blocking = done ? [] : blockingGoals(goal, goals, songAttempts)
  // Came from Practice: you are already practicing, so no button to start.
  const fromPractice = practiceReturn(location.state) !== undefined
  // Back to the screen that sent you here (Practice, Review), else the Goals list.
  const backTo = returnTarget(location.state, paths.goals(song.id))
  const backLabel = fromPractice ? 'Practice' : backTo.includes('/review/') ? 'Review' : 'Goals'

  async function confirmRemove() {
    if (!removing) return
    setRemoveError(undefined)
    try {
      await repos.attempts.delete(removing.id)
      notify('Attempt deleted')
      if (editing?.id === removing.id) setEditing(undefined)
      setRemoving(undefined)
    } catch {
      setRemoveError('Couldn’t delete the attempt. Please try again.')
    }
  }

  return (
    <Page wide>
      <TopBar
        backTo={backTo}
        backLabel={backLabel}
        right={
          <IconLink
            to={paths.editGoal(song.id, goal.id)}
            state={location.state}
            icon="edit"
            label="Edit goal"
            className="desk:border desk:border-line"
          />
        }
      />
      <div className="desk:grid desk:grid-cols-2 desk:items-start desk:gap-x-16 desk:px-15 desk:pb-16 desk:pt-3">
        <div>
          <div className="px-5 pt-2">
            <div className="eyebrow">{sectionName ?? 'Whole song'}</div>
            <h1 className="mt-1.5 font-display text-[32px] leading-[1.1] desk:text-[44px] desk:leading-[1.05]">
              {goal.title}
            </h1>
            {goal.description && <p className="mt-1.5 text-sm text-muted">{goal.description}</p>}
            {blocking.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                <Icon name="lock" size={14} />
                <span>
                  Finish{' '}
                  {blocking.map((other, index) => (
                    <Fragment key={other.id}>
                      {index > 0 && (index === blocking.length - 1 ? ' and ' : ', ')}
                      <Link
                        to={paths.goal(song.id, other.id)}
                        state={withReturn(paths.goal(song.id, goal.id))}
                        className="text-cream underline decoration-line underline-offset-2"
                      >
                        {other.title}
                      </Link>
                    </Fragment>
                  ))}{' '}
                  first
                </span>
              </p>
            )}
            {goal.resources.length > 0 && (
              <div className="mt-3">
                <ResourceLinks resources={goal.resources} label="Goal links" />
              </div>
            )}
          </div>

          <div className="mx-5 mt-5 rounded-card bg-surface p-5">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <span className="text-sm text-muted">{goalSummary(goal, attempts)}</span>
              {done && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-yellow">
                  <Icon name="check" size={14} />
                  Done
                </span>
              )}
            </div>
            <ProgressBar value={goalProgress(goal, attempts)} label="Goal progress" size="lg" />
          </div>

          {!fromPractice && (
            <ButtonLink
              to={paths.practice(song.id, goal.id)}
              variant="secondary"
              icon="play"
              className="mx-5 mt-3"
            >
              Practice this goal
            </ButtonLink>
          )}

          <div className="mx-5 mt-6">
            <AttemptForm
              // A new key starts a fresh form for each attempt being edited.
              key={editing?.id ?? 'new'}
              goal={goal}
              attempts={attempts}
              // From Practice, start at the metronome's tempo instead of the last logged one.
              initialBpm={tempoFrom(location.state)}
              // Logging from Practice: once it is saved, go straight back to the session. An
              // attempt that finishes the goal is celebrated there, or here otherwise.
              onLogged={(saved) => {
                const finished = !done && goalDone(goal, [...attempts, saved])
                const practice = practiceReturn(location.state)
                if (practice)
                  navigate(practice, { state: finished ? { celebrate: goal.id } : null })
                else if (finished) setCelebrating(true)
              }}
              editing={editing}
              onDone={() => setEditing(undefined)}
            />
          </div>
        </div>

        <section className="px-5 pb-12 pt-6 desk:pb-0 desk:pt-2" aria-labelledby="history-heading">
          <div className="flex h-11 items-center">
            <h2 id="history-heading" className="eyebrow">
              History
            </h2>
          </div>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted">No attempts yet. Log your first one above.</p>
          ) : (
            <ul>
              {attempts.map((attempt) => (
                <AttemptRow
                  key={attempt.id}
                  when={formatAttemptDate(attempt.at, now)}
                  bpm={attempt.bpm}
                  level={attempt.level}
                  note={attempt.note}
                  onEdit={() => setEditing(attempt)}
                  onDelete={() => setRemoving(attempt)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <UnlockSheet
        open={celebrating}
        goal={goal}
        goals={goals}
        sections={sections}
        attempts={songAttempts}
        now={now}
        onNext={(other) => navigate(paths.practice(song.id, other.id))}
        onStay={() => setCelebrating(false)}
      />
      <ConfirmSheet
        open={removing !== undefined}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title="Delete this attempt?"
        description={
          removing
            ? `${removing.bpm === null ? 'No tempo' : `${removing.bpm} BPM`} · ${QUALITY_LABELS[removing.level]} from ${formatAttemptDate(removing.at, now)} will be removed. This can’t be undone.`
            : ''
        }
        confirmLabel="Delete attempt"
        onConfirm={confirmRemove}
        error={removeError}
      />
    </Page>
  )
}
