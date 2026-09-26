import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { useToast } from '../../components/toastContext'
import { repos } from '../../data'
import type { Section, Song } from '../../domain/schemas'
import { SectionForm } from '../songs/SectionForm'
import { SongForm } from '../songs/SongForm'
import { StructureEditor } from '../structure/StructureEditor'

/*
 * Editing a song from inside Practice. Each is the same form as the regular screen, in a sheet, so
 * the metronome and the timer keep running (going to another screen would stop the audio).
 */

/** Which editing sheet is open. Only one at a time. */
export type EditSheetKind = 'menu' | 'song' | 'section' | 'newSection' | 'structure'

interface MenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The current goal's section, or undefined for a whole-song goal. */
  sectionName?: string
  onPick: (kind: Exclude<EditSheetKind, 'menu'>) => void
}

/** The list of things you can edit from Practice. */
export function EditMenuSheet({ open, onOpenChange, sectionName, onPick }: MenuProps) {
  const items: Array<{ kind: Exclude<EditSheetKind, 'menu'>; title: string; hint: string }> = [
    { kind: 'song', title: 'Song details', hint: 'Title, artist and chord notes' },
    ...(sectionName
      ? [{ kind: 'section' as const, title: `${sectionName} section`, hint: 'Its name and notes' }]
      : []),
    { kind: 'newSection', title: 'Add a section', hint: 'Verse, Chorus, Bridge and so on' },
    { kind: 'structure', title: 'Play order', hint: 'Rearrange or repeat sections' },
  ]
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Edit">
      <ul className="mt-4 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.kind}>
            <button
              type="button"
              onClick={() => onPick(item.kind)}
              className="block h-16 w-full rounded-row border border-line px-4 text-left hover:bg-surface-2"
            >
              <span className="block text-base font-semibold">{item.title}</span>
              <span className="block text-[13px] text-muted">{item.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  )
}

export function SongSheet({
  open,
  song,
  onClose,
}: {
  open: boolean
  song: Song
  onClose: () => void
}) {
  const { notify } = useToast()
  return (
    <BottomSheet open={open} onOpenChange={(next) => !next && onClose()} title="Song details">
      <SongForm
        className="pt-5"
        defaultValues={{
          title: song.title,
          artist: song.artist,
          chordNotes: song.chordNotes,
          tempo: song.tempo,
          learnedOverride: song.learnedOverride,
        }}
        submitLabel="Save changes"
        showLearned
        onSubmit={async (values) => {
          await repos.songs.update(song.id, values)
          notify('Song updated')
          onClose()
        }}
        footer={
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        }
      />
    </BottomSheet>
  )
}

/** Edits a section, or adds a new one when `section` is not given. */
export function SectionSheet({
  open,
  songId,
  section,
  onClose,
}: {
  open: boolean
  songId: string
  section?: Section
  onClose: () => void
}) {
  const { notify } = useToast()
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={section ? 'Edit section' : 'Add section'}
    >
      <SectionForm
        // A fresh form for each section, so nothing typed for one leaks into the next.
        key={section?.id ?? 'new'}
        className="pt-5"
        defaultValues={{ name: section?.name ?? '', notes: section?.notes ?? '' }}
        submitLabel={section ? 'Save changes' : 'Add section'}
        onSubmit={async (values) => {
          if (section) {
            await repos.sections.update(section.id, values)
            notify('Section updated')
          } else {
            await repos.sections.create(songId, values)
            notify('Section added. Add goals to it to practice it.')
          }
          onClose()
        }}
        footer={
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        }
      />
    </BottomSheet>
  )
}

export function StructureSheet({
  open,
  song,
  sections,
  onClose,
  onAddSection,
}: {
  open: boolean
  song: Song
  sections: Section[]
  onClose: () => void
  onAddSection: () => void
}) {
  const { notify } = useToast()
  return (
    <BottomSheet open={open} onOpenChange={(next) => !next && onClose()} title="Play order">
      {/* The editor pads itself for a full page; the sheet already has its own padding. */}
      <div className="-mx-5 pt-2">
        <StructureEditor
          key={song.id}
          song={song}
          sections={sections}
          onAddSection={onAddSection}
          raised
          onSaved={() => {
            notify('Play order saved')
            onClose()
          }}
        />
      </div>
    </BottomSheet>
  )
}
