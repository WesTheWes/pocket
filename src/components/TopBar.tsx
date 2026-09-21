import type { ReactNode } from 'react'
import { IconLink } from './IconButton'

/** Back button on the left, optional centred title, optional action on the right. */
export function TopBar({
  backTo,
  backState,
  title,
  right,
}: {
  backTo: string
  /** Link state for the back link, e.g. to pass a "return to" along. */
  backState?: unknown
  title?: string
  right?: ReactNode
}) {
  return (
    <div className="flex h-[60px] items-center justify-between pl-2 pr-3 pt-2">
      <IconLink to={backTo} state={backState} icon="back" label="Back" />
      {title && (
        <div className="flex-1 truncate px-2 text-center text-base font-semibold">{title}</div>
      )}
      <div className="flex min-w-11 justify-end">{right}</div>
    </div>
  )
}
