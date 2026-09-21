import { Link } from 'react-router'
import { Icon } from './Icon'
import { ProgressBar } from './ProgressBar'

interface Props {
  to: string
  title: string
  /** 0 to 1 */
  progress: number
  done: boolean
  /** The line under the bar, e.g. "fastest Solid 72 of 84 BPM". */
  summary: string
}

/** A goal with its progress. Deliberately shows no standalone rating: levels belong to attempts. */
export function GoalCard({ to, title, progress, done, summary }: Props) {
  return (
    <Link to={to} className="block rounded-row bg-surface px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-base font-medium leading-[1.3]">{title}</div>
        {done && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-yellow">
            <Icon name="check" size={14} />
            Done
          </span>
        )}
      </div>
      <div className="mt-3">
        <ProgressBar value={progress} label={`${title} progress`} size="lg" />
      </div>
      <div className="mt-2.5 text-[13px] text-muted">{summary}</div>
    </Link>
  )
}
