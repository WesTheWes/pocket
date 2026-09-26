import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { repos } from '../../data'
import { useSections, useSong } from '../../data/hooks'
import { newGoalTargetBpm } from '../../domain/progress'
import { paths } from '../../paths'
import { SongNotFound } from '../songs/SongNotFound'
import { GoalForm } from './GoalForm'

export function NewGoalScreen() {
  const { songId = '' } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const song = useSong(songId)
  const sections = useSections(songId)

  if (song === undefined || !sections) return <Page />
  if (song === null) return <SongNotFound />

  // "?section=" preselects a section (the plus next to a section's name); ignore a bad id.
  const requested = search.get('section')
  const sectionId = sections.some((section) => section.id === requested) ? requested : null

  return (
    <Page>
      <TopBar backTo={paths.goals(song.id)} title="New goal" />
      <GoalForm
        sections={sections}
        defaultValues={{
          sectionId,
          title: '',
          description: '',
          targetBpm: newGoalTargetBpm(song),
        }}
        submitLabel="Add goal"
        onSubmit={async (values) => {
          await repos.goals.create({ songId: song.id, ...values })
          navigate(paths.goals(song.id))
        }}
      />
    </Page>
  )
}
