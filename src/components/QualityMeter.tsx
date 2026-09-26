import { QUALITY_LEVELS, type QualityLevel } from '../domain/quality'
import { cn } from '../lib/cn'

// Full class names, so Tailwind can see them.
const fills: Record<QualityLevel, string> = {
  1: 'bg-q1',
  2: 'bg-q2',
  3: 'bg-q3',
  4: 'bg-q4',
  5: 'bg-q5',
}

/**
 * Five segments filled up to `level`, in that level's colour. Decorative: always pair it with
 * the level's written name, so meaning never depends on colour alone. `target` outlines the
 * level being aimed for, while it is still out of reach.
 */
export function QualityMeter({
  level,
  target,
  className,
}: {
  level: QualityLevel
  target?: QualityLevel
  className?: string
}) {
  return (
    <span aria-hidden="true" className={cn('flex w-full gap-[3px]', className)}>
      {QUALITY_LEVELS.map((segment) => (
        <span
          key={segment}
          className={cn(
            'h-[5px] flex-1 rounded-sm',
            segment <= level ? fills[level] : 'bg-surface-2',
            segment === target && segment > level && 'outline-solid outline-[1.5px] outline-yellow',
          )}
        />
      ))}
    </span>
  )
}
