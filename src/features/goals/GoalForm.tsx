import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useController, useForm } from 'react-hook-form'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { TextAreaField, TextField } from '../../components/Field'
import { Stepper } from '../../components/Stepper'
import { goalFormSchema, type GoalFormValues, type Section } from '../../domain/schemas'

const DEFAULT_TARGET_BPM = 80

interface Props {
  sections: Section[]
  defaultValues: GoalFormValues
  submitLabel: string
  /** Save the values. Throwing shows a generic error and keeps the form as it is. */
  onSubmit: (values: GoalFormValues) => Promise<void>
  /** Extra actions below the submit button, such as Delete. */
  footer?: ReactNode
  /** Replaces the default page padding, e.g. when the form sits inside a sheet. */
  className?: string
}

/** The fields shared by New goal and Edit goal. */
export function GoalForm({
  sections,
  defaultValues,
  submitLabel,
  onSubmit,
  footer,
  className = 'px-5 pb-10 pt-2',
}: Props) {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({ resolver: zodResolver(goalFormSchema), defaultValues })
  const { field: sectionField } = useController({ control, name: 'sectionId' })
  const { field: tempoField } = useController({ control, name: 'targetBpm' })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch {
      setError('root', { message: 'Couldn’t save the goal. Please try again.' })
    }
  })

  const targets = [{ id: null, name: 'Whole song' }, ...sections]

  return (
    <form onSubmit={submit} noValidate className={`flex flex-col gap-[22px] ${className}`}>
      <div role="group" aria-labelledby="applies-to-label">
        <div id="applies-to-label" className="eyebrow">
          Applies to
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2">
          {targets.map((target) => (
            <Chip
              key={target.id ?? 'whole'}
              selected={sectionField.value === target.id}
              onClick={() => sectionField.onChange(target.id)}
            >
              {target.name}
            </Chip>
          ))}
        </div>
      </div>

      <TextField
        label="Title"
        placeholder="e.g. Play the first 4 bars with only bass and melody"
        autoComplete="off"
        error={errors.title?.message}
        {...register('title')}
      />
      <TextAreaField
        label="Description"
        placeholder="What does success look like?"
        className="min-h-[100px] font-sans text-base"
        error={errors.description?.message}
        {...register('description')}
      />
      <Stepper
        label="Target tempo"
        value={tempoField.value}
        onChange={tempoField.onChange}
        noneLabel="No target tempo"
        fallback={DEFAULT_TARGET_BPM}
      />

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
