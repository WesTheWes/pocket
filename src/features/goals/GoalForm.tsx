import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useController, useForm } from 'react-hook-form'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { TextAreaField, TextField } from '../../components/Field'
import { Stepper } from '../../components/Stepper'
import { wouldCycle } from '../../domain/prerequisites'
import { orderGoals } from '../../domain/progress'
import { goalFormSchema, type Goal, type GoalFormValues, type Section } from '../../domain/schemas'

const DEFAULT_TARGET_BPM = 80

interface Props {
  sections: Section[]
  /** Every goal of the song: the others are offered under "Finish first". */
  goals: Goal[]
  /** The goal being edited, so it is not offered to itself and circles are refused. */
  goalId?: string
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
  goals,
  goalId,
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
  const { field: requiresField } = useController({ control, name: 'requires' })
  const required = new Set<string>(requiresField.value)
  const toggleRequired = (id: string) =>
    requiresField.onChange(
      required.has(id) ? requiresField.value.filter((r: string) => r !== id) : [...required, id],
    )
  const candidates = orderGoals(
    goals.filter((goal) => goal.id !== goalId),
    sections,
  )
  const sectionName = (id: string | null) =>
    id === null ? 'Whole song' : (sections.find((section) => section.id === id)?.name ?? '')

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

      {candidates.length > 0 && (
        <div role="group" aria-labelledby="finish-first-label" aria-describedby="finish-first-help">
          <div id="finish-first-label" className="eyebrow">
            Finish first
          </div>
          <p id="finish-first-help" className="mt-1 text-[13px] text-muted">
            Goals to finish before this one. It only sets the order: you can still practise and log
            attempts on it.
          </p>
          <div className="mt-1 flex flex-wrap gap-x-2">
            {candidates.map((goal) => {
              // Picking this one would make the chain lead back here.
              const circular =
                goalId !== undefined &&
                !required.has(goal.id) &&
                wouldCycle(goalId, [...required, goal.id], goals)
              return (
                <Chip
                  key={goal.id}
                  selected={required.has(goal.id)}
                  onClick={() => toggleRequired(goal.id)}
                  disabled={circular}
                  title={circular ? 'That goal already needs this one first' : undefined}
                  className="disabled:opacity-40"
                >
                  <span className="sr-only">{sectionName(goal.sectionId)}: </span>
                  {goal.title}
                </Chip>
              )
            })}
          </div>
        </div>
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
