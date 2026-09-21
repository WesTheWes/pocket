import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { QualityPicker } from '../../components/QualityPicker'
import { Stepper } from '../../components/Stepper'
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
}

/**
 * Logs an attempt: the tempo you played and how it felt. Remount it (change its `key`) to start
 * a different attempt. New attempts pick up the song's open practice session, if there is one.
 */
export function AttemptForm({ goal, attempts, initialBpm, editing, onDone }: Props) {
  const fallbackBpm = initialBpm ?? startingBpm(goal, attempts)
  const [bpm, setBpm] = useState<number | null>(editing ? editing.bpm : fallbackBpm)
  const [level, setLevel] = useState<QualityLevel | null>(editing?.level ?? null)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)
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
        await repos.attempts.update(editing.id, { bpm, level })
        onDone()
      } else {
        const session = await repos.sessions.getActive(goal.songId)
        await repos.attempts.create({ goalId: goal.id, bpm, level, sessionId: session?.id ?? null })
        setLevel(null)
        setSaved(true)
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
      className="flex flex-col gap-[18px] rounded-card bg-surface p-5"
      aria-labelledby="attempt-form-title"
    >
      <h2 id="attempt-form-title" className="text-base font-semibold">
        {editing ? 'Edit attempt' : 'Log attempt'}
      </h2>
      <Stepper
        label="Tempo you played"
        value={bpm}
        onChange={(next) => {
          setBpm(next)
          setSaved(false)
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
            setSaved(false)
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-pink">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-yellow">
          Attempt saved.
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
