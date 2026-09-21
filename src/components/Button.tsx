import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '../lib/cn'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'danger' | 'destructive'

const base =
  'inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-[22px] text-base font-semibold transition-[filter,background-color] disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-orange text-ink hover:brightness-105',
  secondary: 'border border-line bg-surface-2 text-cream hover:bg-line',
  danger: 'border border-pink bg-transparent text-pink hover:bg-pink/10',
  destructive: 'bg-pink text-ink hover:brightness-105',
}

interface Shared {
  variant?: Variant
  icon?: IconName
  children: ReactNode
}

export function Button({
  variant = 'primary',
  icon,
  children,
  className,
  type = 'button',
  ...rest
}: Shared & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cn(base, variants[variant], className)} {...rest}>
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  icon,
  children,
  className,
  ...rest
}: Shared & LinkProps) {
  return (
    <Link className={cn(base, variants[variant], className)} {...rest}>
      {icon && <Icon name={icon} size={20} />}
      {children}
    </Link>
  )
}
