import type { ReactNode } from 'react'
import { IconLink } from './IconButton'

/** Back button on the left, optional centred title, optional action on the right. */
export function TopBar({
  backTo,
  title,
  right,
}: {
  backTo: string
  title?: string
  right?: ReactNode
}) {
  return (
    <div className="flex h-[60px] items-center justify-between pl-2 pr-3 pt-2">
      <IconLink to={backTo} icon="back" label="Back" />
      {title && (
        <div className="flex-1 truncate px-2 text-center text-base font-semibold">{title}</div>
      )}
      <div className="flex min-w-11 justify-end">{right}</div>
    </div>
  )
}
