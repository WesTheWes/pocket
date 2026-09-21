import { useNavigate } from 'react-router'
import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { repos } from '../../data'
import { paths } from '../../paths'
import { SongForm } from './SongForm'

export function NewSongScreen() {
  const navigate = useNavigate()

  return (
    <Page>
      <TopBar backTo={paths.home} title="New song" />
      <SongForm
        defaultValues={{ title: '', artist: '', chordNotes: '', learnedOverride: false }}
        submitLabel="Create song"
        onSubmit={async ({ title, artist, chordNotes }) => {
          const song = await repos.songs.create({ title, artist, chordNotes })
          navigate(paths.song(song.id))
        }}
      />
    </Page>
  )
}
