import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { TextAreaField } from '../../components/Field'
import { QualityPicker } from '../../components/QualityPicker'
import { Stepper } from '../../components/Stepper'
import { useToast } from '../../components/toastContext'
import { repos } from '../../data'
import { startingBpm } from '../../domain/progress'
import type { QualityLevel } from '../../domain/quality'
import type { Attempt, Goal } from '../../domain/schemas'

interface Props {
  goal: Goal
  /** The goal's attempts, used to pick a sensible starting tempo. */
  attempts: Attempt[]
  /** Tempo to start a new attempt at (e.g. the metronome's). Defaults to the last logged one. */
  initialBpm?: number
  /** Set to edit an existing attempt instead of logging a new one. */
  editing?: Attempt
  /** Called after an edit is saved or cancelled. */
  onDone: () => void
  /** Called with a new attempt once it is saved (e.g. to go back to Practice). */
  onLogged?: (attempt: Attempt) => void
  /** In a sheet: no card or heading, and the note folded away behind "Add a note". */
  compact?: boolean
}

/**
 * Logs an attempt: the tempo you played and how it felt. Remount it (change its `key`) to start
 * a different attempt. New attempts pick up the song's open practice session, if there is one.
 */
export function AttemptForm({
  goal,
  attempts,
  initialBpm,
  editing,
  onDone,
  onLogged,
  compact = false,
}: Props) {
  const { notify } = useToast()
  const [showNote, setShowNote] = useState(!compact)
  const fallbackBpm = initialBpm ?? startingBpm(goal, attempts)
  const [bpm, setBpm] = useState<number | null>(editing ? editing.bpm : fallbackBpm)
  const [level, setLevel] = useState<QualityLevel | null>(editing?.level ?? null)
  const [note, setNote] = useState(editing?.note ?? '')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLFormElement>(null)

  // Editing starts from a row further down the page, so bring the form into view.
  useEffect(() => {
    if (editing) ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }, [editing])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (level === null) {
      setError('Choose how it felt')
      return
    }
    setSaving(true)
    setError(undefined)
    try {
      if (editing) {
        await repos.attempts.update(editing.id, { bpm, level, note: note.trim() })
        notify('Attempt updated')
        onDone()
      } else {
        const session = await repos.sessions.getActive(goal.songId)
        const saved = await repos.attempts.create({
          goalId: goal.id,
          bpm,
          level,
          note: note.trim(),
          sessionId: session?.id ?? null,
        })
        setLevel(null)
        setNote('')
        notify('Attempt saved')
        onLogged?.(saved)
      }
    } catch {
      setError('Couldn’t save the attempt. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      ref={ref}
      onSubmit={submit}
      noValidate
      className={
        compact ? 'flex flex-col gap-4' : 'flex flex-col gap-[18px] rounded-card bg-surface p-5'
      }
      aria-labelledby={compact ? undefined : 'attempt-form-title'}
      aria-label={compact ? 'Log attempt' : undefined}
    >
      {!compact && (
        <h2 id="attempt-form-title" className="text-base font-semibold">
          {editing ? 'Edit attempt' : 'Log attempt'}
        </h2>
      )}
      <Stepper
        label="Tempo you played"
        value={bpm}
        onChange={(next) => {
          setBpm(next)
        }}
        noneLabel="No tempo"
        fallback={fallbackBpm}
      />
      <div>
        <div className="eyebrow mb-2">How it felt</div>
        <QualityPicker
          label="How it felt"
          value={level}
          onChange={(next) => {
            setLevel(next)
            setError(undefined)
          }}
        />
      </div>
      {showNote ? (
        <TextAreaField
          label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What went wrong, what to try next"
          className="min-h-[88px] text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="-my-1 self-start px-1 text-sm font-semibold text-orange"
        >
          Add a note
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-pink">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        <Button type="submit" disabled={saving}>
          Save attempt
        </Button>
        {editing && (
          <Button variant="secondary" onClick={onDone} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
