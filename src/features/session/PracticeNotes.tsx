import { useId, useState } from 'react'
import { Icon } from '../../components/Icon'
import { cn } from '../../lib/cn'
import { useStoredFlag } from '../../lib/useStoredFlag'

type TabId = 'section' | 'chords'

interface Props {
  /** The current section's name, or undefined for a whole-song goal. */
  sectionName?: string
  sectionNotes: string
  /** The whole song's chord chart. */
  chordNotes: string
}

/**
 * The notes worth having in front of you while you practice: the current section's notes and the
 * song's chord chart. It minimizes to a slim row (and remembers that you did), and shows nothing
 * at all when there is nothing to show.
 */
export function PracticeNotes({ sectionName, sectionNotes, chordNotes }: Props) {
  const [open, setOpen] = useStoredFlag('pocket:practice:notes-open', true)
  const [wanted, setWanted] = useState<TabId>('section')
  const id = useId()

  const tabs = [
    ...(sectionNotes.trim()
      ? [{ id: 'section' as const, label: `${sectionName ?? 'Section'} notes`, text: sectionNotes }]
      : []),
    ...(chordNotes.trim() ? [{ id: 'chords' as const, label: 'Chords', text: chordNotes }] : []),
  ]
  if (tabs.length === 0) return null

  // Stay on the tab you chose (say, the chord chart) as goals change; fall back if it is gone.
  const active = tabs.find((tab) => tab.id === wanted) ?? tabs[0]

  return (
    <section
      aria-label="Notes"
      className="mx-5 mt-2 rounded-card bg-surface desk:mx-0 desk:mt-3 desk:rounded-[24px]"
    >
      <div className="flex items-center gap-2 pl-3 pr-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen(!open)}
          className="flex h-11 shrink-0 items-center gap-1.5 pr-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted"
        >
          <Icon name={open ? 'up' : 'down'} size={16} />
          Notes
        </button>

        {open ? (
          <div role="tablist" aria-label="Notes" className="flex min-w-0 gap-1.5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${id}-${tab.id}`}
                aria-selected={tab.id === active.id}
                aria-controls={`${id}-panel`}
                onClick={() => setWanted(tab.id)}
                className="flex h-11 shrink-0 items-center"
              >
                <span
                  className={cn(
                    'flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-[13px] font-medium',
                    tab.id === active.id ? 'border-cream bg-cream text-ink' : 'border-line',
                  )}
                >
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <span className="min-w-0 truncate text-xs text-muted">
            {tabs.map((tab) => tab.label).join(' · ')}
          </span>
        )}
      </div>

      {open && (
        <div
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-${active.id}`}
          // Focusable so keyboard users can scroll a long chart.
          tabIndex={0}
          className="max-h-[40dvh] overflow-auto px-4 pb-4"
        >
          {active.id === 'chords' ? (
            // Never wrap: the columns of a chord chart only make sense if they line up.
            <div className="chord-notes whitespace-pre!">{active.text}</div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{active.text}</p>
          )}
        </div>
      )}
    </section>
  )
}
