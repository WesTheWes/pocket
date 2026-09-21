import type { ReactNode } from 'react'

export type IconName =
  | 'back'
  | 'edit'
  | 'plus'
  | 'play'
  | 'search'
  | 'chevron'
  | 'sort'
  | 'list'
  | 'check'
  | 'grip'
  | 'close'
  | 'trash'

const glyphs: Record<IconName, ReactNode> = {
  back: <path d="M15 5l-7 7 7 7" />,
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  play: <path d="M8 5v14l11-7z" fill="currentColor" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  chevron: <path d="M9 5l7 7-7 7" />,
  sort: <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />,
  list: <path d="M5 7h14M5 12h14M5 17h9" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  grip: (
    <>
      <circle cx="9" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  trash: (
    <>
      <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
}

/** Decorative: give the button or link around it an accessible name. */
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyphs[name]}
    </svg>
  )
}
