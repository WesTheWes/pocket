import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useController, useForm } from 'react-hook-form'
import { Button } from '../../components/Button'
import { TextAreaField, TextField } from '../../components/Field'
import { Stepper } from '../../components/Stepper'
import { Switch } from '../../components/Switch'
import { songFormSchema, type SongFormValues } from '../../domain/schemas'
import { cn } from '../../lib/cn'

interface Props {
  defaultValues: SongFormValues
  submitLabel: string
  /** Save the values. Throwing shows a generic error and keeps the form as it is. */
  onSubmit: (values: SongFormValues) => Promise<void>
  /** Shows the manual "Learned" switch (Edit only). */
  showLearned?: boolean
  /** Extra actions below the submit button, such as Delete. */
  footer?: ReactNode
  /** Replaces the default page padding, e.g. when the form sits inside a sheet. */
  className?: string
  /** On a wide page: two columns at `desk:`, with the chord chart tall on the right. Not for sheets. */
  wide?: boolean
}

/** Where the tempo starts when it is switched on for a song that had none. */
const DEFAULT_SONG_BPM = 100

/** The fields shared by New song and Edit song. */
export function SongForm({
  defaultValues,
  submitLabel,
  onSubmit,
  showLearned,
  footer,
  className = 'px-5 pb-10 pt-2',
  wide = false,
}: Props) {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SongFormValues>({ resolver: zodResolver(songFormSchema), defaultValues })
  const { field: tempoField } = useController({ control, name: 'tempo' })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch {
      setError('root', { message: 'Couldn’t save the song. Please try again.' })
    }
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(
        'flex flex-col gap-5',
        className,
        wide && 'desk:grid desk:grid-cols-[5fr_7fr] desk:gap-x-16 desk:px-20 desk:pb-16 desk:pt-6',
      )}
    >
      <TextField
        label="Title"
        placeholder="Song title"
        autoComplete="off"
        error={errors.title?.message}
        {...register('title')}
      />
      <TextField
        label="Artist"
        placeholder="Artist"
        autoComplete="off"
        error={errors.artist?.message}
        {...register('artist')}
      />
      <div>
        <Stepper
          label="Tempo"
          value={tempoField.value}
          onChange={tempoField.onChange}
          noneLabel="No tempo set"
          fallback={DEFAULT_SONG_BPM}
        />
        <p className="mt-2 text-[13px] text-muted">New goals start with this as their target.</p>
      </div>
      {/* On desktop the chart stands tall on the right, beside everything else. */}
      <div className={cn(wide && 'desk:col-start-2 desk:row-span-5 desk:row-start-1')}>
        <TextAreaField
          label="Chord notes"
          placeholder="Chords, feel, anything you want to remember"
          spellCheck={false}
          className={cn('min-h-[230px] font-mono text-sm', wide && 'desk:min-h-[560px]')}
          error={errors.chordNotes?.message}
          {...register('chordNotes')}
        />
      </div>
      {showLearned && (
        <Switch
          label="Mark as learned"
          description="Counts this song as learned even if some goals aren’t done."
          {...register('learnedOverride')}
        />
      )}

      <div className="mt-1 flex flex-col gap-2.5">
        {errors.root && (
          <p role="alert" className="text-sm text-pink">
            {errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  )
}
