import { cn } from '../lib/cn'

const heights = { sm: 'h-1', md: 'h-[5px]', lg: 'h-1.5' } as const
const tracks = { surface: 'bg-surface-2', line: 'bg-line' } as const

interface Props {
  /** 0 to 1 */
  value: number
  /** Accessible name, e.g. "Piano Man progress". */
  label: string
  size?: keyof typeof heights
  /** Track colour, chosen to contrast with the card it sits on. */
  track?: keyof typeof tracks
}

export function ProgressBar({ value, label, size = 'md', track = 'surface' }: Props) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn('w-full overflow-hidden rounded-full', heights[size], tracks[track])}
    >
      <div className="h-full rounded-full bg-orange" style={{ width: `${percent}%` }} />
    </div>
  )
}
