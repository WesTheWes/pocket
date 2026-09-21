import { Link } from 'react-router'
import { toPercent } from '../domain/progress'
import { ProgressBar } from './ProgressBar'
import { IconLink } from './IconButton'

interface Props {
  title: string
  artist: string
  /** 0 to 1 */
  progress: number
  learned: boolean
  /** Where tapping the card goes. */
  to: string
  /** Where the round play button goes. */
  practiceTo: string
}

export function SongCard({ title, artist, progress, learned, to, practiceTo }: Props) {
  const percent = toPercent(progress)
  return (
    <div className="flex items-center gap-2 rounded-card bg-surface py-1 pl-5 pr-2.5">
      <Link to={to} className="block min-w-0 flex-1 py-3.5">
        <div className="truncate font-display text-[25px] leading-[1.1]">{title}</div>
        {artist && <div className="mt-[3px] truncate text-sm text-muted">{artist}</div>}
        <div className="mt-3.5 flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={progress} label={`${title} progress`} />
          </div>
          {learned ? (
            <span className="text-[13px] font-semibold text-yellow">Learned</span>
          ) : (
            <span className="w-10 text-right text-[13px] font-semibold tabular-nums">
              {percent}%
            </span>
          )}
        </div>
      </Link>
      <IconLink to={practiceTo} icon="play" variant="tonal" label={`Practice ${title}`} />
    </div>
  )
}
