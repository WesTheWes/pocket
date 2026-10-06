import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/BottomSheet'
import { GoalCard } from '../../components/GoalCard'
import { Icon } from '../../components/Icon'
import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { repos } from '../../data'
import { useGoals, useSection, useSong, useSongAttempts } from '../../data/hooks'
import { goalSummary } from '../../domain/goalSummary'
import { goalDone, goalProgress } from '../../domain/progress'
import { paths } from '../../paths'
import { sectionDeleteWarning } from './deleteWarning'
import { SectionForm } from './SectionForm'
import { SectionNotFound } from './SectionNotFound'
import { SongNotFound } from './SongNotFound'

export function EditSectionScreen() {
  const { songId = '', sectionId = '' } = useParams()
  const navigate = useNavigate()
  const song = useSong(songId)
  const section = useSection(sectionId)
  const goals = useGoals(songId)
  const attempts = useSongAttempts(songId)

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()

  // Still loading from IndexedDB.
  if (song === undefined || section === undefined || !goals || !attempts) return <Page />
  if (song === null) return <SongNotFound />
  // Once the delete has gone through, the section vanishes before we navigate away.
  if (section === null || section.songId !== song.id) {
    return deleting ? <Page /> : <SectionNotFound songId={song.id} />
  }

  const sectionGoals = goals
    .filter((goal) => goal.sectionId === section.id)
    .sort((a, b) => a.createdAt - b.createdAt)
  const structureSlots = song.structure.filter((id) => id === section.id).length

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(undefined)
    try {
      await repos.sections.delete(sectionId)
      navigate(paths.song(songId), { replace: true })
    } catch {
      setDeleting(false)
      setDeleteError('Couldn’t delete the section. Please try again.')
    }
  }

  return (
    <Page wide>
      <TopBar backTo={paths.song(song.id)} backLabel={song.title} title="Edit section" />
      <SectionForm
        wide
        // Defaults are read once, so live updates never overwrite what is being typed.
        key={section.id}
        defaultValues={{ name: section.name, notes: section.notes }}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await repos.sections.update(section.id, values)
          navigate(paths.song(song.id))
        }}
        extra={
          <section aria-labelledby="section-goals-heading">
            <div className="flex h-11 items-center justify-between">
              <h2 id="section-goals-heading" className="eyebrow">
                Goals in this section
              </h2>
              <Link
                to={paths.newGoal(song.id, section.id)}
                className="flex h-11 items-center gap-1.5 px-1 text-sm font-semibold text-orange"
              >
                <Icon name="plus" size={18} />
                Add
              </Link>
            </div>
            {sectionGoals.length === 0 ? (
              <p className="text-sm text-muted">
                No goals yet. Add one to start tracking this section.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {sectionGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    to={paths.goal(song.id, goal.id)}
                    title={goal.title}
                    progress={goalProgress(goal, attempts)}
                    done={goalDone(goal, attempts)}
                    summary={goalSummary(goal, attempts)}
                  />
                ))}
              </div>
            )}
          </section>
        }
        footer={
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete section
          </Button>
        }
      />
      <ConfirmSheet
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete “${section.name}”?`}
        description={sectionDeleteWarning(sectionGoals.length, structureSlots)}
        confirmLabel="Delete section"
        onConfirm={handleDelete}
        busy={deleting}
        error={deleteError}
      />
    </Page>
  )
}
