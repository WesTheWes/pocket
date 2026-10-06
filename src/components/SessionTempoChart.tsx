import { QUALITY_LABELS, type QualityLevel } from '../domain/quality'
import type { Attempt } from '../domain/schemas'

const W = 320
const H = 64
const PAD = { top: 10, right: 64, bottom: 10, left: 8 }
const INNER = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom }

// Full class names, so Tailwind can see them.
const fills: Record<QualityLevel, string> = {
  1: 'fill-q1',
  2: 'fill-q2',
  3: 'fill-q3',
  4: 'fill-q4',
  5: 'fill-q5',
}

/**
 * The tempos one goal was tried at during a session, in order, each dot coloured by how it
 * felt, against a dashed line at the target. The label and hidden list say it in words.
 */
export function SessionTempoChart({
  attempts,
  targetBpm,
  goalTitle,
}: {
  /** The session's attempts for the goal, oldest first. Ones without a tempo are skipped. */
  attempts: Attempt[]
  targetBpm: number | null
  goalTitle: string
}) {
  const played = attempts.filter((a): a is Attempt & { bpm: number } => a.bpm !== null)
  if (played.length === 0) return null

  const bpms = played.map((a) => a.bpm)
  if (targetBpm !== null) bpms.push(targetBpm)
  const lo = Math.min(...bpms)
  const hi = Math.max(...bpms)
  // Breathing room above and below, and never a flat line through a single value.
  const span = Math.max(hi - lo, 10)
  const bottom = lo - span * 0.15
  const top = hi + span * 0.15
  const x = (index: number) =>
    played.length === 1
      ? PAD.left + INNER.w / 2
      : PAD.left + (index / (played.length - 1)) * INNER.w
  const y = (bpm: number) => PAD.top + (1 - (bpm - bottom) / (top - bottom)) * INNER.h
  const path = played.map((a, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(a.bpm)}`).join(' ')
  const described = played.map((a) => `${a.bpm} BPM (${QUALITY_LABELS[a.level]})`).join(', ')
  const summary = `Tempos this session for ${goalTitle}: ${described}.${targetBpm === null ? '' : ` Target ${targetBpm} BPM.`}`

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="block w-full">
        {targetBpm !== null && (
          <>
            <line
              x1={PAD.left}
              x2={W - PAD.right + 6}
              y1={y(targetBpm)}
              y2={y(targetBpm)}
              className="stroke-yellow"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={W - PAD.right + 10}
              y={y(targetBpm)}
              dominantBaseline="middle"
              className="fill-muted text-[10px]"
            >
              target {targetBpm}
            </text>
          </>
        )}
        {played.length > 1 && (
          <path
            d={path}
            fill="none"
            className="stroke-muted"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}
        {played.map((attempt, index) => (
          <g key={attempt.id}>
            <circle
              cx={x(index)}
              cy={y(attempt.bpm)}
              r={5}
              className={`${fills[attempt.level]} stroke-surface`}
              strokeWidth={2}
            />
            <circle cx={x(index)} cy={y(attempt.bpm)} r={14} fill="transparent">
              <title>{`${attempt.bpm} BPM · ${QUALITY_LABELS[attempt.level]}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">
        <ul>
          {played.map((attempt) => (
            <li key={attempt.id}>
              {attempt.bpm} BPM, {QUALITY_LABELS[attempt.level]}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}
