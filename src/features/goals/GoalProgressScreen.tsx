import { useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { AttemptRow } from '../../components/AttemptRow'
import { ConfirmSheet } from '../../components/BottomSheet'
import { Icon } from '../../components/Icon'
import { IconLink } from '../../components/IconButton'
import { Page } from '../../components/Page'
import { ProgressBar } from '../../components/ProgressBar'
import { TopBar } from '../../components/TopBar'
import { repos } from '../../data'
import { useGoal, useGoalAttempts, useSections, useSong } from '../../data/hooks'
import { goalSummary } from '../../domain/goalSummary'
import { goalDone, goalProgress } from '../../domain/progress'
import { QUALITY_LABELS } from '../../domain/quality'
import type { Attempt } from '../../domain/schemas'
import { formatAttemptDate } from '../../lib/formatDate'
import { returnTarget } from '../../lib/returnTo'
import { paths } from '../../paths'
import { SongNotFound } from '../songs/SongNotFound'
import { AttemptForm } from './AttemptForm'
import { GoalNotFound } from './GoalNotFound'

export function GoalProgressScreen() {
  const { songId = '', goalId = '' } = useParams()
  const location = useLocation()
  const song = useSong(songId)
  const sections = useSections(songId)
  const goal = useGoal(goalId)
  const attempts = useGoalAttempts(goalId)

  const [editing, setEditing] = useState<Attempt>()
  const [removing, setRemoving] = useState<Attempt>()
  const [removeError, setRemoveError] = useState<string>()
  const [now] = useState(() => Date.now())

  // Still loading from IndexedDB.
  if (song === undefined || !sections || goal === undefined || !attempts) return <Page />
  if (song === null) return <SongNotFound />
  if (goal === null || goal.songId !== song.id) return <GoalNotFound songId={song.id} />

  const sectionName = sections.find((section) => section.id === goal.sectionId)?.name
  const done = goalDone(goal, attempts)

  async function confirmRemove() {
    if (!removing) return
    setRemoveError(undefined)
    try {
      await repos.attempts.delete(removing.id)
      if (editing?.id === removing.id) setEditing(undefined)
      setRemoving(undefined)
    } catch {
      setRemoveError('Couldn’t delete the attempt. Please try again.')
    }
  }

  return (
    <Page>
      <TopBar
        // Back to the screen that sent you here (Practice, Review), else the Goals list.
        backTo={returnTarget(location.state, paths.goals(song.id))}
        right={
          <IconLink
            to={paths.editGoal(song.id, goal.id)}
            state={location.state}
            icon="edit"
            label="Edit goal"
          />
        }
      />
      <div className="px-5 pt-2">
        <div className="eyebrow">{sectionName ?? 'Whole song'}</div>
        <h1 className="mt-1.5 font-display text-[32px] leading-[1.1]">{goal.title}</h1>
        {goal.description && <p className="mt-1.5 text-sm text-muted">{goal.description}</p>}
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

      <div className="mx-5 mt-6">
        <AttemptForm
          // A new key starts a fresh form for each attempt being edited.
          key={editing?.id ?? 'new'}
          goal={goal}
          attempts={attempts}
          editing={editing}
          onDone={() => setEditing(undefined)}
        />
      </div>

      <section className="px-5 pb-12 pt-6" aria-labelledby="history-heading">
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
                onEdit={() => setEditing(attempt)}
                onDelete={() => setRemoving(attempt)}
              />
            ))}
          </ul>
        )}
      </section>

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
