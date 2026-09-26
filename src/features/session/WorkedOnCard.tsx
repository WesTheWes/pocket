import { IconLink } from '../../components/IconButton'
import { QualityMeter } from '../../components/QualityMeter'
import { SOLID } from '../../domain/quality'
import type { GoalChange } from '../../domain/session'
import { cn } from '../../lib/cn'
import { formatTimeAgo } from '../../lib/formatDate'
import { withReturn } from '../../lib/returnTo'
import { paths } from '../../paths'
import { changeTag, lastAttempt, qualityText, tempoText } from './reviewText'

/** An earlier attempt older than this gets a note, so a big jump or dip reads in context. */
const OLD_ATTEMPT_MS = 14 * 24 * 60 * 60 * 1000

/**
 * One goal from the session: its last attempt before the session against its last one in it
 * (tempo and quality), and what changed.
 */
export function WorkedOnCard({
  change,
  sectionName,
  songId,
  returnTo,
  now,
}: {
  change: GoalChange
  sectionName: string
  songId: string
  /** Where the back arrow on the goal's progress screen should come back to. */
  returnTo: string
  now: number
}) {
  const { goal, lastBefore } = change
  const tag = changeTag(change)
  const level = lastAttempt(change).level
  return (
    <li className="rounded-row bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="eyebrow">{sectionName}</div>
          <h3 className="mt-1 text-[17px] font-medium leading-[1.3]">{goal.title}</h3>
        </div>
        <IconLink
          to={paths.goal(songId, goal.id)}
          state={withReturn(returnTo)}
          icon="edit"
          label={`Edit progress for ${goal.title}`}
          className="-mr-2 -mt-2 text-muted"
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-[13px] text-muted">Tempo</dt>
          <dd className="mt-1 text-[17px] font-semibold tabular-nums">{tempoText(change)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Quality</dt>
          <dd className="mt-1 text-[17px] font-semibold leading-[1.35]">{qualityText(change)}</dd>
        </div>
      </dl>

      <QualityMeter level={level} target={SOLID} className="mt-4 [&>span]:h-2" />

      {lastBefore && now - lastBefore.at > OLD_ATTEMPT_MS && (
        <p className="mt-3 text-[13px] text-muted">
          Last time: {formatTimeAgo(lastBefore.at, now).toLowerCase()}
        </p>
      )}

      <div
        className={cn('mt-3 text-[13px] font-semibold', tag.good ? 'text-yellow' : 'text-muted')}
      >
        {tag.text}
      </div>
    </li>
  )
}
