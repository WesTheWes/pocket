import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { TextAreaField, TextField } from '../../components/Field'
import { SECTION_PRESETS } from '../../domain/sections'
import { sectionFormSchema, type SectionFormValues } from '../../domain/schemas'

interface Props {
  defaultValues: SectionFormValues
  submitLabel: string
  /** Save the values. Throwing shows a generic error and keeps the form as it is. */
  onSubmit: (values: SectionFormValues) => Promise<void>
  /** Content between the notes and the buttons, such as the section's goals. */
  extra?: ReactNode
  /** Extra actions below the submit button, such as Delete. */
  footer?: ReactNode
}

/** The fields shared by New section and Edit section. */
export function SectionForm({ defaultValues, submitLabel, onSubmit, extra, footer }: Props) {
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
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 px-5 pb-10 pt-2">
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
      <TextAreaField
        label="Notes"
        placeholder="Fingering, feel, tricky spots"
        className="min-h-[130px] font-sans text-base"
        error={errors.notes?.message}
        {...register('notes')}
      />
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
