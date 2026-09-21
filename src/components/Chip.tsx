import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

/** A selectable filter chip. 36px tall to look at, 44px tall to tap. */
export function Chip({
  selected,
  children,
  className,
  ...rest
}: { selected?: boolean; children: ReactNode } & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-pressed'
>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn('flex h-11 items-center', className)}
      {...rest}
    >
      <span
        className={cn(
          'flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium',
          selected ? 'border-cream bg-cream text-ink' : 'border-line text-cream',
        )}
      >
        {children}
      </span>
    </button>
  )
}

/** A small read-only label, such as one slot in a song's structure. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-8 items-center rounded-full bg-surface px-3 text-[13px] font-medium">
      {children}
    </span>
  )
}
