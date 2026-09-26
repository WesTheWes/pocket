import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { repos } from '../../data'
import { newGoalTargetBpm } from '../../domain/progress'
import type { Goal, Section, Song } from '../../domain/schemas'
import { GoalForm } from '../goals/GoalForm'

/** What the sheet is for: adding a goal to a section (or the whole song), or editing one. */
export type GoalSheetTarget =
  { mode: 'add'; sectionId: string | null } | { mode: 'edit'; goal: Goal }

interface Props {
  /** Null keeps the sheet closed. */
  target: GoalSheetTarget | null
  song: Song
  sections: Section[]
  onClose: () => void
  /** Called with the saved goal, after it has been written. */
  onSaved: (goal: Goal) => void
}

/**
 * Add or edit a goal without leaving Practice, so the metronome keeps playing and the timer keeps
 * running. It is the same form as the New goal and Edit goal screens.
 */
export function GoalSheet({ target, song, sections, onClose, onSaved }: Props) {
  const editing = target?.mode === 'edit'

  return (
    <BottomSheet
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      title={editing ? 'Edit goal' : 'Add goal'}
    >
      {target && (
        <GoalForm
          // A fresh form for each goal, so nothing typed for one leaks into the next.
          key={target.mode === 'edit' ? target.goal.id : 'new'}
          className="pt-5"
          sections={sections}
          defaultValues={
            target.mode === 'edit'
              ? {
                  sectionId: target.goal.sectionId,
                  title: target.goal.title,
                  description: target.goal.description,
                  targetBpm: target.goal.targetBpm,
                }
              : {
                  sectionId: target.sectionId,
                  title: '',
                  description: '',
                  targetBpm: newGoalTargetBpm(song),
                }
          }
          submitLabel={target.mode === 'edit' ? 'Save changes' : 'Add goal'}
          onSubmit={async (values) => {
            const saved =
              target.mode === 'edit'
                ? await repos.goals.update(target.goal.id, values)
                : await repos.goals.create({ songId: song.id, ...values })
            onSaved(saved)
          }}
          footer={
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          }
        />
      )}
    </BottomSheet>
  )
}
