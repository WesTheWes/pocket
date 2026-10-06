import { QUALITY_LABELS, type QualityLevel } from '../domain/quality'
import { IconButton } from './IconButton'
import { QualityMeter } from './QualityMeter'

interface Props {
  /** Already formatted, e.g. "Sep 21 · Today". */
  when: string
  bpm: number | null
  level: QualityLevel
  /** What was written about the attempt, if anything. */
  note?: string
  onEdit: () => void
  onDelete: () => void
}

/** One line of a goal's history: when, tempo, how it felt (meter, name), and any note. */
export function AttemptRow({ when, bpm, level, note, onEdit, onDelete }: Props) {
  return (
    <li className="flex items-center border-b border-line py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-muted">{when}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-base font-semibold tabular-nums">
          <span>{bpm === null ? 'No tempo' : `${bpm} BPM`}</span>
          <span className="font-normal text-muted">· {QUALITY_LABELS[level]}</span>
          <span className="w-12">
            <QualityMeter level={level} />
          </span>
        </div>
        {note && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{note}</p>}
      </div>
      <IconButton icon="edit" label={`Edit attempt from ${when}`} onClick={onEdit} />
      <IconButton icon="trash" label={`Delete attempt from ${when}`} onClick={onDelete} />
    </li>
  )
}
