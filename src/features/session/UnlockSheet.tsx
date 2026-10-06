import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { IconButton } from '../../components/IconButton'
import { bpmGained, doneFacts } from '../../domain/celebrate'
import { currentLevel, nextOnPath } from '../../domain/levels'
import { latestNote } from '../../domain/notes'
import { doneCount, goalDone } from '../../domain/progress'
import type { Attempt, Goal, Section } from '../../domain/schemas'
import { unlockedBy } from '../../domain/suggest'
import { doneStory } from './doneStory'

/**
 * The moment an attempt finishes a goal: what it took, where the song stands now, what just
 * opened, and where to go next. Understated on purpose: a check in rings, no confetti.
 */
export function UnlockSheet({
  open,
  goal,
  goals,
  sections,
  attempts,
  now,
  onNext,
  onStay,
}: {
  open: boolean
  goal: Goal
  /** Every goal of the song. */
  goals: Goal[]
  sections: Section[]
  /** Every attempt of the song. */
  attempts: Attempt[]
  now: number
  /** Go on to another goal (one that just opened). */
  onNext: (goal: Goal) => void
  onStay: () => void
}) {
  const opened = unlockedBy(goal, goals, attempts)
  const gained = bpmGained(goal, attempts)
  const level = currentLevel(goals, attempts)
  const section = sections.find((s) => s.id === goal.sectionId)
  const sectionGoals = section ? goals.filter((g) => g.sectionId === section.id) : []
  const sectionComplete = section !== undefined && sectionGoals.every((g) => goalDone(g, attempts))
  const note = latestNote(goal.id, attempts)
  // Where the path goes next: the next open goal after this one, not merely what just opened.
  const next = nextOnPath(goal, goals, sections, attempts)

  return (
    <BottomSheet
      open={open}
      onOpenChange={(isOpen) => !isOpen && onStay()}
      title={goal.title}
      description={doneStory(goal, attempts, now)}
      before={
        <div className="flex flex-col items-center gap-2.5 pb-3 pt-1">
          <div className="relative flex size-[88px] items-center justify-center">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-yellow opacity-35"
            />
            <span
              aria-hidden="true"
              className="absolute inset-2.5 rounded-full border-2 border-yellow opacity-60"
            />
            <span className="flex size-14 items-center justify-center rounded-full bg-yellow text-ink">
              <Icon name="check" size={30} />
            </span>
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-yellow">
            Goal done
          </div>
        </div>
      }
    >
      <dl className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-row bg-surface-2 p-3 text-center">
          <dd className="text-[22px] font-semibold leading-[1.1] tabular-nums">
            {gained === null ? doneFacts(goal, attempts).attemptCount : `+${gained}`}
          </dd>
          <dt className="mt-0.5 text-xs text-muted">
            {gained === null ? 'attempts' : 'BPM gained'}
          </dt>
        </div>
        <div className="rounded-row bg-surface-2 p-3 text-center">
          <dd className="text-[22px] font-semibold leading-[1.1] tabular-nums">
            {doneCount(goals, attempts)} of {goals.length}
          </dd>
          <dt className="mt-0.5 text-xs text-muted">goals done</dt>
        </div>
        <div className="rounded-row bg-surface-2 p-3 text-center">
          <dd className="text-[22px] font-semibold leading-[1.1] text-yellow">Level {level}</dd>
          <dt className="mt-0.5 text-xs text-muted">
            {sectionComplete ? `${section.name} complete` : 'of the song'}
          </dt>
        </div>
      </dl>

      {opened.length > 0 && (
        <section aria-labelledby="now-open-heading" className="mt-5">
          <h3 id="now-open-heading" className="eyebrow flex items-center gap-1.5">
            <Icon name="lock" size={12} />
            Now open
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {opened.map((other) => (
              <li
                key={other.id}
                className="flex items-center gap-3 rounded-row bg-surface-2 py-1.5 pl-3.5 pr-2"
              >
                <span
                  aria-hidden="true"
                  className="size-7 shrink-0 rounded-full border-2 border-yellow"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{other.title}</span>
                  <span className="block text-[13px] text-muted">
                    {sections.find((s) => s.id === other.sectionId)?.name ?? 'Whole song'}
                    {other.targetBpm !== null && ` · target ${other.targetBpm}`}
                  </span>
                </span>
                <IconButton
                  icon="play"
                  variant="tonal"
                  label={`Go to ${other.title}`}
                  className="size-11 bg-surface"
                  onClick={() => onNext(other)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        {next ? (
          <Button icon="chevron" onClick={() => onNext(next)}>
            Next: {next.title}
          </Button>
        ) : (
          <Button icon="check" onClick={onStay}>
            Keep going
          </Button>
        )}
        {next && (
          <Button variant="secondary" onClick={onStay}>
            Stay on this one
          </Button>
        )}
        {note && <p className="text-center text-[13px] text-muted">Your note: “{note.note}”</p>}
      </div>
    </BottomSheet>
  )
}
