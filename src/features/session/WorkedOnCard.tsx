import { IconLink } from '../../components/IconButton'
import { QualityMeter } from '../../components/QualityMeter'
import { QUALITY_LABELS } from '../../domain/quality'
import type { GoalChange } from '../../domain/session'
import { cn } from '../../lib/cn'
import { withReturn } from '../../lib/returnTo'
import { paths } from '../../paths'
import { beforeAfterText, changeTag } from './reviewText'

/** One goal from the session: where it moved, what you played, and whether it improved. */
export function WorkedOnCard({
  change,
  sectionName,
  songId,
  returnTo,
}: {
  change: GoalChange
  sectionName: string
  songId: string
  /** Where the back arrow on the goal's progress screen should come back to. */
  returnTo: string
}) {
  const { goal, attempts, improved } = change
  return (
    <li className="rounded-row bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="eyebrow">{sectionName}</div>
          <h3 className="mt-1 text-base font-medium leading-[1.3]">{goal.title}</h3>
        </div>
        <IconLink
          to={paths.goal(songId, goal.id)}
          state={withReturn(returnTo)}
          icon="edit"
          label={`Edit progress for ${goal.title}`}
          className="text-muted"
        />
      </div>

      <p className="mt-2.5 text-[15px] font-semibold tabular-nums">{beforeAfterText(change)}</p>

      <ul className="mt-3 flex flex-col gap-2" aria-label={`Attempts on ${goal.title}`}>
        {attempts.map((attempt) => (
          <li key={attempt.id} className="flex items-center gap-3 text-sm">
            <span className="w-[4.5rem] tabular-nums">
              {attempt.bpm === null ? 'No tempo' : `${attempt.bpm} BPM`}
            </span>
            <span className="w-20 shrink-0">
              <QualityMeter level={attempt.level} />
            </span>
            <span className="text-muted">{QUALITY_LABELS[attempt.level]}</span>
          </li>
        ))}
      </ul>

      <div
        className={cn('mt-3.5 text-[13px] font-semibold', improved ? 'text-yellow' : 'text-muted')}
      >
        {changeTag(change)}
      </div>
    </li>
  )
}
