import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../lib/cn'

const control =
  'w-full rounded-field border border-line bg-surface text-base text-cream placeholder:text-muted aria-[invalid=true]:border-pink'

interface FieldShellProps {
  label: string
  error?: string
  id: string
  children: ReactNode
}

function FieldShell({ label, error, id, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-pink">
          {error}
        </p>
      )}
    </div>
  )
}

type Extra = { label: string; error?: string }

/** A labelled single-line input. Works with React Hook Form's `register`. */
export function TextField({
  label,
  error,
  id,
  className,
  ...rest
}: Extra & ComponentProps<'input'>) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <FieldShell label={label} error={error} id={fieldId}>
      <input
        id={fieldId}
        type="text"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(control, 'h-[52px] px-4', className)}
        {...rest}
      />
    </FieldShell>
  )
}

/** A labelled multi-line input. Monospace, so chord charts keep their alignment. */
export function TextAreaField({
  label,
  error,
  id,
  className,
  ...rest
}: Extra & ComponentProps<'textarea'>) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <FieldShell label={label} error={error} id={fieldId}>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(
          control,
          'resize-none px-4 py-3.5 leading-[1.6]',
          // Height and font are one setting: a caller's replaces the default rather than stacking.
          className ?? 'min-h-[230px] font-mono text-sm',
        )}
        {...rest}
      />
    </FieldShell>
  )
}
