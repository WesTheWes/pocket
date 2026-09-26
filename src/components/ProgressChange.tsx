import type { ReactNode } from 'react'
import { toPercent } from '../domain/progress'
import { cn } from '../lib/cn'

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/**
 * One row of a before/after chart: a label, "45% → 61%", and a track with a hollow dot where
 * progress was and a filled dot where it is now. The track is decorative; the text says it all.
 */
export function ProgressChange({
  eyebrow,
  title,
  before,
  after,
  aside,
}: {
  eyebrow: string
  title: string
  /** 0 to 1 */
  before: number
  /** 0 to 1 */
  after: number
  /** Shown top right, e.g. "4 days ago". The percentages then move down beside the title. */
  aside?: ReactNode
}) {
  const from = toPercent(clamp(before))
  const to = toPercent(clamp(after))
  const change = (
    <span className="shrink-0 text-sm font-semibold tabular-nums">
      <span aria-hidden="true">
        {from}% → <span className={cn(to > from && 'text-yellow')}>{to}%</span>
      </span>
      <span className="sr-only">
        {from === to ? `unchanged at ${to}%` : `from ${from}% to ${to}%`}
      </span>
    </span>
  )

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="eyebrow">{eyebrow}</div>
        {aside ? <div className="shrink-0 text-[13px] text-muted">{aside}</div> : change}
      </div>
      <div className="mt-1 flex items-start justify-between gap-3">
        <h3 className="text-base font-medium leading-[1.35]">{title}</h3>
        {aside && change}
      </div>
      <Track from={from} to={to} />
    </li>
  )
}

function Track({ from, to }: { from: number; to: number }) {
  const low = Math.min(from, to)
  const high = Math.max(from, to)
  return (
    <div aria-hidden="true" className="relative mt-4 h-2.5">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
      {from === to ? (
        <Dot at={to} className="bg-muted" />
      ) : (
        <>
          <div
            className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-orange"
            style={{ left: `${low}%`, width: `${high - low}%` }}
          />
          <Dot at={from} className="border-[1.5px] border-muted bg-surface" />
          <Dot at={to} className="bg-orange" />
        </>
      )}
    </div>
  )
}

function Dot({ at, className }: { at: number; className: string }) {
  return (
    <span
      className={cn('absolute top-0 size-2.5 -translate-x-1/2 rounded-full', className)}
      style={{ left: `${at}%` }}
    />
  )
}

/** A card holding ProgressChange rows, divided by hairlines. */
export function ProgressChangeList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="divide-y divide-line rounded-card bg-surface px-5 py-5">
      {children}
    </ul>
  )
}

/** "○ Before ● After", for the top right of a section holding ProgressChange rows. */
export function BeforeAfterLegend() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full border-[1.5px] border-muted" />
        Before
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-orange" />
        After
      </span>
    </div>
  )
}
