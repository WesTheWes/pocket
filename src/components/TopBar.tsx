import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from './Icon'

/**
 * Back button on the left, optional title, optional action on the right. On phones the title is
 * centred in the bar; on desktop (`desk:`) the bar becomes the Song screen's header row, with the
 * parent's name beside the arrow (`backLabel`) and the title as a large serif heading below it.
 * One set of elements, restyled, so nothing is duplicated for assistive tech or tests.
 */
export function TopBar({
  backTo,
  backState,
  backLabel,
  title,
  right,
}: {
  backTo: string
  /** Link state for the back link, e.g. to pass a "return to" along. */
  backState?: unknown
  /** Shown beside the arrow on desktop: where back goes, e.g. "Songs" or the song's title. */
  backLabel?: string
  title?: string
  right?: ReactNode
}) {
  return (
    <div className="flex h-[60px] items-center justify-between pl-2 pr-3 pt-2 desk:h-auto desk:flex-wrap desk:px-20 desk:pt-7">
      <Link
        to={backTo}
        state={backState}
        aria-label="Back"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-cream hover:bg-surface-2 desk:w-auto desk:gap-2 desk:text-sm desk:font-medium desk:text-muted desk:hover:bg-transparent desk:[&>svg]:size-[18px]"
      >
        <Icon name="back" size={22} />
        {backLabel && <span className="hidden desk:inline">{backLabel}</span>}
      </Link>
      {title && (
        <h1 className="flex-1 truncate px-2 text-center text-base font-semibold desk:order-last desk:mt-6 desk:basis-full desk:px-0 desk:text-left desk:font-display desk:text-[44px] desk:font-normal desk:leading-none">
          {title}
        </h1>
      )}
      <div className="flex min-w-11 justify-end">{right}</div>
    </div>
  )
}
