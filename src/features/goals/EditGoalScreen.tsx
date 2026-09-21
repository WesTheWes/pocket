import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/BottomSheet'
import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { repos } from '../../data'
import { useGoal, useGoalAttempts, useSections, useSong } from '../../data/hooks'
import { returnTarget } from '../../lib/returnTo'
import { paths } from '../../paths'
import { SongNotFound } from '../songs/SongNotFound'
import { goalDeleteWarning } from './deleteWarning'
import { GoalForm } from './GoalForm'
import { GoalNotFound } from './GoalNotFound'

export function EditGoalScreen() {
  const { songId = '', goalId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const song = useSong(songId)
  const sections = useSections(songId)
  const goal = useGoal(goalId)
  const attempts = useGoalAttempts(goalId)

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()

  // Still loading from IndexedDB.
  if (song === undefined || !sections || goal === undefined || !attempts) return <Page />
  if (song === null) return <SongNotFound />
  // Once the delete has gone through, the goal vanishes before we navigate away.
  if (goal === null || goal.songId !== song.id) {
    return deleting ? <Page /> : <GoalNotFound songId={song.id} />
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(undefined)
    try {
      await repos.goals.delete(goalId)
      // Back to Practice or Review if that's where you came from, else the Goals list.
      navigate(returnTarget(location.state, paths.goals(songId)), { replace: true })
    } catch {
      setDeleting(false)
      setDeleteError('Couldn’t delete the goal. Please try again.')
    }
  }

  return (
    <Page>
      <TopBar backTo={paths.goal(song.id, goal.id)} backState={location.state} title="Edit goal" />
      <GoalForm
        // Defaults are read once, so live updates never overwrite what is being typed.
        key={goal.id}
        sections={sections}
        defaultValues={{
          sectionId: goal.sectionId,
          title: goal.title,
          description: goal.description,
          targetBpm: goal.targetBpm,
        }}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await repos.goals.update(goal.id, values)
          navigate(paths.goal(song.id, goal.id), { state: location.state })
        }}
        footer={
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete goal
          </Button>
        }
      />
      <ConfirmSheet
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this goal?"
        description={goalDeleteWarning(goal.title, attempts.length)}
        confirmLabel="Delete goal"
        onConfirm={handleDelete}
        busy={deleting}
        error={deleteError}
      />
    </Page>
  )
}
