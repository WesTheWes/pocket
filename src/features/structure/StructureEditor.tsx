import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { Button, ButtonLink } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Icon } from '../../components/Icon'
import { repos } from '../../data'
import type { Section, Song } from '../../domain/schemas'
import { cn } from '../../lib/cn'
import { paths } from '../../paths'
import { addSlot, moveSlot, removeSlot, toSlots, toStructure, type Slot } from './slots'

let slotCounter = 0
const newKey = () => `slot-${++slotCounter}`

interface Props {
  song: Song
  sections: Section[]
  /** Called once the new order has been saved. */
  onSaved: () => void
  /** What the "no sections yet" state offers. Without it, that state links to the add-section page. */
  onAddSection?: () => void
  /** Use a lighter row colour, for when the editor sits on a surface (a sheet), not the page. */
  raised?: boolean
  /** On a wide page: the order on the left and "Add to structure" on the right at `desk:`. */
  wide?: boolean
}

/**
 * Arranges a song's play order. It edits a draft that is only written on Save. It renders no page
 * chrome, so a screen or a sheet can host it.
 */
export function StructureEditor({ song, sections, onSaved, onAddSection, raised, wide }: Props) {
  const [slots, setSlots] = useState<Slot[]>(() => toSlots(song.structure, newKey))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const names = new Map(sections.map((section) => [section.id, section.name]))
  const nameOf = (slot: Slot) => names.get(slot.sectionId) ?? 'Removed section'

  // Drag by pointer (from the handle only, so the page still scrolls) or by keyboard:
  // focus a handle, press Space to lift, arrow keys to move, Space to drop.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over) setSlots((current) => moveSlot(current, String(active.id), String(over.id)))
  }

  // Spoken by screen readers while dragging. Default ids would be meaningless ("slot-7").
  const indexOf = (id: string | number) => slots.findIndex((slot) => slot.key === String(id))
  const nameFor = (id: string | number) => {
    const index = indexOf(id)
    return index === -1 ? 'item' : nameOf(slots[index])
  }
  const total = slots.length
  // Dropping on a slot puts the dragged one at that slot's position, so `over`'s index is the answer.
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${nameFor(active.id)}, position ${indexOf(active.id) + 1} of ${total}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameFor(active.id)} is over position ${indexOf(over.id) + 1} of ${total}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${nameFor(active.id)} at position ${indexOf(over.id) + 1} of ${total}.`
        : `Dropped ${nameFor(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Cancelled. ${nameFor(active.id)} stays at position ${indexOf(active.id) + 1}.`,
  }

  async function save() {
    setSaving(true)
    setError(undefined)
    try {
      await repos.songs.setStructure(song.id, toStructure(slots))
      onSaved()
    } catch {
      setSaving(false)
      setError('Couldn’t save the structure. Please try again.')
    }
  }

  return (
    <div
      className={cn(
        wide &&
          'desk:grid desk:grid-cols-[7fr_5fr] desk:items-start desk:gap-x-12 desk:px-15 desk:pb-16 desk:pt-4',
      )}
    >
      <p className="px-5 pt-1 text-[15px] text-muted">
        The order the sections are played in. Drag to reorder, and reuse a section as often as you
        need.
      </p>

      {sections.length === 0 ? (
        <div className="flex flex-col items-start gap-3 px-5 pt-6">
          <p className="text-muted">This song has no sections to arrange yet.</p>
          {onAddSection ? (
            <Button icon="plus" onClick={onAddSection}>
              Add a section
            </Button>
          ) : (
            <ButtonLink to={paths.newSection(song.id)} icon="plus">
              Add a section
            </ButtonLink>
          )}
        </div>
      ) : (
        <>
          {slots.length === 0 ? (
            <p className="px-5 pt-6 text-sm text-muted">
              Nothing in the order yet. Add sections below.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              accessibility={{ announcements }}
            >
              <SortableContext
                items={slots.map((slot) => slot.key)}
                strategy={verticalListSortingStrategy}
              >
                <ol className="flex flex-col gap-2 px-5 pt-4" aria-label="Play order">
                  {slots.map((slot, index) => (
                    <SlotRow
                      key={slot.key}
                      slot={slot}
                      name={nameOf(slot)}
                      position={index + 1}
                      raised={raised}
                      onRemove={() => setSlots((current) => removeSlot(current, slot.key))}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          <section
            className={cn('px-5 pt-5', wide && 'desk:col-start-2 desk:row-span-3 desk:row-start-1')}
            aria-labelledby="add-heading"
          >
            <div className="flex h-11 items-center">
              <h2 id="add-heading" className="eyebrow">
                Add to structure
              </h2>
            </div>
            <div className="flex flex-wrap gap-x-2">
              {sections.map((section) => (
                <Chip
                  key={section.id}
                  aria-label={`Add ${section.name} to structure`}
                  onClick={() => setSlots((current) => addSlot(current, section.id, newKey))}
                >
                  + {section.name}
                </Chip>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-2.5 px-5 pb-10 pt-5">
            {error && (
              <p role="alert" className="text-sm text-pink">
                {error}
              </p>
            )}
            <Button onClick={save} disabled={saving} className="w-full">
              Save structure
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function SlotRow({
  slot,
  name,
  position,
  raised,
  onRemove,
}: {
  slot: Slot
  name: string
  position: number
  raised?: boolean
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.key,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex h-14 items-center gap-1 rounded-field pl-1 pr-1',
        raised ? 'bg-surface-2' : 'bg-surface',
        isDragging && 'relative z-10 bg-line shadow-lg shadow-black/40',
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${name}, position ${position}`}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={20} />
      </button>
      <span className="w-6 text-center text-[13px] tabular-nums text-muted">{position}</span>
      <span className="flex-1 truncate text-base font-medium">{name}</span>
      <button
        type="button"
        aria-label={`Remove ${name} from position ${position}`}
        onClick={onRemove}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-cream"
      >
        <Icon name="close" size={20} />
      </button>
    </li>
  )
}
