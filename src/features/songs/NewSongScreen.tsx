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
        defaultValues={{
          title: '',
          artist: '',
          chordNotes: '',
          tempo: null,
          learnedOverride: false,
        }}
        submitLabel="Create song"
        onSubmit={async ({ title, artist, chordNotes, tempo }) => {
          const song = await repos.songs.create({ title, artist, chordNotes, tempo })
          navigate(paths.song(song.id))
        }}
      />
    </Page>
  )
}
