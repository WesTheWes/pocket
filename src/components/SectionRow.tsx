import { Link } from 'react-router'
import { toPercent } from '../domain/progress'
import { Icon } from './Icon'
import { ProgressBar } from './ProgressBar'

interface Props {
  to: string
  name: string
  goalCount: number
  doneCount: number
  /** 0 to 1 */
  progress: number
}

export function SectionRow({ to, name, goalCount, doneCount, progress }: Props) {
  const summary =
    goalCount === 0
      ? 'No goals yet'
      : `${goalCount} ${goalCount === 1 ? 'goal' : 'goals'} · ${doneCount} done`
  return (
    <Link to={to} className="flex items-center gap-3 border-b border-line py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="truncate text-[17px] font-semibold">{name}</span>
          <span className="text-[13px] font-semibold tabular-nums">{toPercent(progress)}%</span>
        </div>
        <div className="mb-2.5 mt-0.5 text-[13px] text-muted">{summary}</div>
        <ProgressBar value={progress} label={`${name} progress`} size="sm" track="line" />
      </div>
      <span className="text-muted">
        <Icon name="chevron" size={18} />
      </span>
    </Link>
  )
}
