import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '../lib/cn'
import { Icon, type IconName } from './Icon'

/** ghost: bare icon. outline: ringed. tonal: the round play button (48px, orange glyph). */
type Variant = 'ghost' | 'outline' | 'tonal'

const base = 'inline-flex shrink-0 items-center justify-center rounded-full'

const variants: Record<Variant, string> = {
  ghost: 'size-11 text-cream hover:bg-surface-2',
  outline: 'size-11 border border-line text-cream hover:bg-surface-2',
  tonal: 'size-12 bg-surface-2 text-orange hover:bg-line',
}

interface Shared {
  /** Required: icon-only controls need an accessible name. */
  label: string
  icon: IconName
  variant?: Variant
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  className,
  type = 'button',
  ...rest
}: Shared & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(base, variants[variant], className)}
      {...rest}
    >
      <Icon name={icon} size={variant === 'tonal' ? 20 : 22} />
    </button>
  )
}

export function IconLink({
  label,
  icon,
  variant = 'ghost',
  className,
  ...rest
}: Shared & LinkProps) {
  return (
    <Link aria-label={label} className={cn(base, variants[variant], className)} {...rest}>
      <Icon name={icon} size={variant === 'tonal' ? 20 : 22} />
    </Link>
  )
}
