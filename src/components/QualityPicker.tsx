import { useId } from 'react'
import { QUALITY_LABELS, QUALITY_LEVELS, type QualityLevel } from '../domain/quality'
import { cn } from '../lib/cn'
import { Icon } from './Icon'
import { QualityMeter } from './QualityMeter'

interface Props {
  label: string
  value: QualityLevel | null
  onChange: (level: QualityLevel) => void
}

/** Pick one of the five levels. Real radio inputs, so arrow keys move the choice natively. */
export function QualityPicker({ label, value, onChange }: Props) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-1.5">
      {QUALITY_LEVELS.map((level) => {
        const selected = value === level
        return (
          <label
            key={level}
            className={cn(
              'flex h-[52px] cursor-pointer items-center gap-3.5 rounded-field border px-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-yellow',
              selected ? 'border-cream bg-surface-2' : 'border-line',
            )}
          >
            <input
              type="radio"
              name={name}
              value={level}
              checked={selected}
              onChange={() => onChange(level)}
              className="sr-only"
            />
            <span className="w-16 shrink-0">
              <QualityMeter level={level} />
            </span>
            <span className="flex-1 text-[15px] font-medium">{QUALITY_LABELS[level]}</span>
            {selected && <Icon name="check" size={18} />}
          </label>
        )
      })}
    </div>
  )
}
