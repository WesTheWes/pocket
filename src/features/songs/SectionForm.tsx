import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { TextAreaField, TextField } from '../../components/Field'
import { SECTION_PRESETS } from '../../domain/sections'
import { sectionFormSchema, type SectionFormValues } from '../../domain/schemas'
import { cn } from '../../lib/cn'

interface Props {
  defaultValues: SectionFormValues
  submitLabel: string
  /** Save the values. Throwing shows a generic error and keeps the form as it is. */
  onSubmit: (values: SectionFormValues) => Promise<void>
  /** Content between the notes and the buttons, such as the section's goals. */
  extra?: ReactNode
  /** Extra actions below the submit button, such as Delete. */
  footer?: ReactNode
  /** Replaces the default page padding, e.g. when the form sits inside a sheet. */
  className?: string
  /** On a wide page: two columns at `desk:`, with the notes tall on the right. Not for sheets. */
  wide?: boolean
}

/** The fields shared by New section and Edit section. */
export function SectionForm({
  defaultValues,
  submitLabel,
  onSubmit,
  extra,
  footer,
  className = 'px-5 pb-10 pt-2',
  wide = false,
}: Props) {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<SectionFormValues>({ resolver: zodResolver(sectionFormSchema), defaultValues })

  const name = useWatch({ control, name: 'name' })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch {
      setError('root', { message: 'Couldn’t save the section. Please try again.' })
    }
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(
        'flex flex-col gap-5',
        className,
        wide && 'desk:grid desk:grid-cols-2 desk:gap-x-16 desk:px-20 desk:pb-16 desk:pt-6',
      )}
    >
      <div>
        <TextField
          label="Name"
          placeholder="Section name"
          autoComplete="off"
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="mt-1 flex flex-wrap gap-x-2" role="group" aria-label="Common names">
          {SECTION_PRESETS.map((preset) => (
            <Chip
              key={preset}
              selected={name === preset}
              onClick={() =>
                setValue('name', preset, { shouldDirty: true, shouldValidate: isSubmitted })
              }
            >
              {preset}
            </Chip>
          ))}
        </div>
      </div>
      <div className={cn(wide && 'desk:col-start-2 desk:row-span-3 desk:row-start-1')}>
        <TextAreaField
          label="Notes"
          placeholder="Fingering, feel, tricky spots"
          className={cn('min-h-[130px] font-sans text-base', wide && 'desk:min-h-[360px]')}
          error={errors.notes?.message}
          {...register('notes')}
        />
      </div>
      {extra}

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
