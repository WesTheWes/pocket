import type { ProgressPoint } from '../domain/history'
import { toPercent } from '../domain/progress'
import { cn } from '../lib/cn'
import { formatTimeAgo } from '../lib/formatDate'
import { plural } from '../lib/plural'

const W = 320
const H = 120
const PAD = { top: 14, right: 14, bottom: 22, left: 14 }
const INNER = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom }

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/**
 * A song's progress over its practice sessions: one orange line, a dot per session, and a ring
 * on the session being reviewed. Decorative beyond its label and the hidden list, which say the
 * same thing in words.
 */
export function ProgressHistoryChart({
  points,
  highlightId,
  now,
}: {
  /** Oldest first, from `progressHistory`. At least two. */
  points: ProgressPoint[]
  /** The session to ring. */
  highlightId: string
  /** The time dates are measured against (the reviewed session's start). */
  now: number
}) {
  const x = (index: number) => PAD.left + (index / (points.length - 1)) * INNER.w
  const y = (progress: number) => PAD.top + (1 - clamp(progress)) * INNER.h
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.progress)}`).join(' ')
  const label = (point: ProgressPoint) =>
    point.sessionId === null
      ? 'Before'
      : point.sessionId === highlightId
        ? 'This session'
        : formatTimeAgo(point.at, now)
  const sessions = points.length - 1
  const first = points[0]
  const last = points[points.length - 1]
  const summary = `Song progress over ${plural(sessions, 'session')}: ${toPercent(first.progress)}% before the first, ${toPercent(last.progress)}% after the latest.`

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="block w-full">
        {[0, 0.5, 1].map((level) => (
          <line
            key={level}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(level)}
            y2={y(level)}
            className="stroke-line"
            strokeWidth={1}
          />
        ))}
        <path
          d={path}
          fill="none"
          className="stroke-orange"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => {
          const highlighted = point.sessionId === highlightId
          return (
            <g key={point.sessionId ?? 'before'}>
              {highlighted && (
                <circle
                  cx={x(index)}
                  cy={y(point.progress)}
                  r={9}
                  fill="none"
                  className="stroke-yellow"
                  strokeWidth={1.5}
                />
              )}
              <circle
                cx={x(index)}
                cy={y(point.progress)}
                r={highlighted ? 5 : 4}
                className={cn('stroke-surface', highlighted ? 'fill-yellow' : 'fill-orange')}
                strokeWidth={2}
              />
              {/* A wide, invisible target so the tooltip is easy to hit. */}
              <circle cx={x(index)} cy={y(point.progress)} r={14} fill="transparent">
                <title>{`${label(point)}: ${toPercent(point.progress)}%`}</title>
              </circle>
            </g>
          )
        })}
        <text x={PAD.left} y={H - 6} className="fill-muted text-[10px]">
          {label(first)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-muted text-[10px]">
          {label(last)}
        </text>
      </svg>
      <figcaption className="sr-only">
        <ul>
          {points.map((point) => (
            <li key={point.sessionId ?? 'before'}>
              {label(point)}: {toPercent(point.progress)}%
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}
