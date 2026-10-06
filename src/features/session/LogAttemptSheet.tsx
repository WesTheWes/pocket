import { BottomSheet } from '../../components/BottomSheet'
import type { Attempt, Goal } from '../../domain/schemas'
import { AttemptForm } from '../goals/AttemptForm'

/**
 * Log an attempt without leaving Practice, so the metronome and timer keep going: the tempo is
 * already the metronome's, the quality rows sit mid-screen and Save is right under them.
 */
export function LogAttemptSheet({
  open,
  goal,
  attempts,
  bpm,
  onClose,
  onLogged,
}: {
  open: boolean
  goal: Goal
  attempts: Attempt[]
  /** The metronome's tempo, which the attempt starts at. */
  bpm: number
  onClose: () => void
  onLogged: (attempt: Attempt) => void
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Log attempt"
      description={goal.title}
    >
      {open && (
        <div className="mt-4">
          <AttemptForm
            // A fresh form each time the sheet opens, at the metronome's tempo.
            key={`${goal.id}-${bpm}`}
            goal={goal}
            attempts={attempts}
            initialBpm={bpm}
            compact
            onDone={onClose}
            onLogged={onLogged}
          />
        </div>
      )}
    </BottomSheet>
  )
}
