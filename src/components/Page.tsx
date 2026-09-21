import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

/**
 * The page frame. Every screen is a centred ~480px column on phones and tablets.
 * `wide` screens (Home, Song, Practice) open up to a full desktop layout at `desk:` (900px).
 */
export function Page({
  wide = false,
  children,
  className,
}: {
  wide?: boolean
  children?: ReactNode
  className?: string
}) {
  return (
    <main
      className={cn(
        'mx-auto flex min-h-dvh w-full max-w-[480px] flex-col',
        wide && 'desk:max-w-[1280px]',
        className,
      )}
    >
      {children}
    </main>
  )
}
