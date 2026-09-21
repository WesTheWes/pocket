import { useId, useState } from 'react'
import { MAX_BPM, MIN_BPM } from '../domain/schemas'

interface Props {
  /** Visible label above the stepper, e.g. "Target tempo". */
  label: string
  /** The tempo, or null for "no tempo". */
  value: number | null
  onChange: (value: number | null) => void
  /** Label of the checkbox that clears the tempo, e.g. "No target tempo". */
  noneLabel: string
  /** Where to start when the tempo was cleared and is turned back on. */
  fallback: number
}

const clamp = (n: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, n))

/** A tempo control: minus, a big number you can also type into, plus, and a "no tempo" switch. */
export function Stepper({ label, value, onChange, noneLabel, fallback }: Props) {
  const id = useId()
  // The tempo to bring back when "no tempo" is switched off again.
  const [remembered, setRemembered] = useState(value ?? fallback)

  // While typing, the input holds its own text; it is committed on blur or Enter.
  const [draft, setDraft] = useState<string | null>(null)
  const none = value === null

  function commit() {
    if (draft === null) return
    const typed = Number.parseInt(draft, 10)
    if (!Number.isNaN(typed)) onChange(clamp(typed))
    setDraft(null)
  }

  const step = (delta: number) => () => onChange(clamp((value ?? remembered) + delta))

  return (
    <div role="group" aria-labelledby={`${id}-label`}>
      <div id={`${id}-label`} className="eyebrow">
        {label}
      </div>
      <div
        className={`mt-2 flex h-[68px] items-center justify-between rounded-row border border-line bg-surface px-2.5 ${none ? 'opacity-50' : ''}`}
      >
        <StepButton label="Decrease tempo" onClick={step(-1)} disabled={none || value <= MIN_BPM}>
          −
        </StepButton>
        <div className="flex items-baseline gap-1">
          <input
            aria-label={`${label}, in BPM`}
            inputMode="numeric"
            disabled={none}
            value={none ? '—' : (draft ?? String(value))}
            onFocus={(event) => event.target.select()}
            onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 3))}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              }
            }}
            className="w-[3.2ch] bg-transparent text-center font-display text-4xl tabular-nums text-cream outline-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow"
          />
          <span className="text-sm text-muted">BPM</span>
        </div>
        <StepButton label="Increase tempo" onClick={step(1)} disabled={none || value >= MAX_BPM}>
          +
        </StepButton>
      </div>
      <label className="mt-1 flex h-11 cursor-pointer items-center gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          checked={none}
          onChange={(event) => {
            if (event.target.checked) {
              setRemembered(value ?? remembered)
              onChange(null)
            } else {
              onChange(remembered)
            }
          }}
          className="size-5 accent-orange"
        />
        {noneLabel}
      </label>
    </div>
  )
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  children: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-12 items-center justify-center rounded-full border border-line bg-surface-2 text-2xl leading-none text-cream hover:bg-line disabled:opacity-40"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}
