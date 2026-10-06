import { useNavigate, useParams } from 'react-router'
import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { repos } from '../../data'
import { useSong } from '../../data/hooks'
import { paths } from '../../paths'
import { SectionForm } from './SectionForm'
import { SongNotFound } from './SongNotFound'

export function NewSectionScreen() {
  const { songId = '' } = useParams()
  const navigate = useNavigate()
  const song = useSong(songId)

  if (song === undefined) return <Page />
  if (song === null) return <SongNotFound />

  return (
    <Page wide>
      <TopBar backTo={paths.song(song.id)} backLabel={song.title} title="New section" />
      <SectionForm
        wide
        defaultValues={{ name: '', notes: '' }}
        submitLabel="Add section"
        onSubmit={async (values) => {
          await repos.sections.create(song.id, values)
          navigate(paths.song(song.id))
        }}
      />
    </Page>
  )
}
