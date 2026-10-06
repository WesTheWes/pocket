import { Link, useNavigate } from 'react-router'
import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { repos } from '../../data'
import { paths } from '../../paths'
import { SongForm } from './SongForm'

export function NewSongScreen() {
  const navigate = useNavigate()

  return (
    <Page wide>
      <TopBar backTo={paths.home} backLabel="Songs" title="New song" />
      <SongForm
        wide
        defaultValues={{
          title: '',
          artist: '',
          chordNotes: '',
          tempo: null,
          learnedOverride: false,
          resources: [],
        }}
        submitLabel="Create song"
        onSubmit={async ({ title, artist, chordNotes, tempo, resources }) => {
          const song = await repos.songs.create({ title, artist, chordNotes, tempo, resources })
          navigate(paths.song(song.id))
        }}
      />
      <p className="px-5 pb-10 text-sm text-muted desk:px-20">
        Or let an assistant plan it: sections, goals and links from one description.{' '}
        <Link to={paths.planSong} className="font-semibold text-orange">
          Plan a song
        </Link>
      </p>
    </Page>
  )
}
