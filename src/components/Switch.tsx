import type { ComponentProps } from 'react'

/** An on/off switch built on a real checkbox, so it works with forms and assistive tech. */
export function Switch({
  label,
  description,
  ...rest
}: { label: string; description?: string } & Omit<ComponentProps<'input'>, 'type' | 'role'>) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-row bg-surface px-4 py-3">
      <span>
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" {...rest} />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full border border-line bg-surface-2 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-muted after:transition-transform peer-checked:border-orange peer-checked:bg-orange peer-checked:after:translate-x-5 peer-checked:after:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-yellow"
      />
    </label>
  )
}
