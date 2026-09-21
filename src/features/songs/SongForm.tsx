import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/Button'
import { TextAreaField, TextField } from '../../components/Field'
import { Switch } from '../../components/Switch'
import { songFormSchema, type SongFormValues } from '../../domain/schemas'

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
}

/** The fields shared by New song and Edit song. */
export function SongForm({
  defaultValues,
  submitLabel,
  onSubmit,
  showLearned,
  footer,
  className = 'px-5 pb-10 pt-2',
}: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SongFormValues>({ resolver: zodResolver(songFormSchema), defaultValues })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch {
      setError('root', { message: 'Couldn’t save the song. Please try again.' })
    }
  })

  return (
    <form onSubmit={submit} noValidate className={`flex flex-col gap-5 ${className}`}>
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
      <TextAreaField
        label="Chord notes"
        placeholder="Chords, feel, anything you want to remember"
        spellCheck={false}
        error={errors.chordNotes?.message}
        {...register('chordNotes')}
      />
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
