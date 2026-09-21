import { useNavigate, useParams } from 'react-router'
import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { useSections, useSong } from '../../data/hooks'
import { paths } from '../../paths'
import { SongNotFound } from '../songs/SongNotFound'
import { StructureEditor } from './StructureEditor'

export function StructureScreen() {
  const { songId = '' } = useParams()
  const navigate = useNavigate()
  const song = useSong(songId)
  const sections = useSections(songId)

  // Still loading from IndexedDB.
  if (song === undefined || !sections) return <Page />
  if (song === null) return <SongNotFound />

  return (
    <Page>
      <TopBar backTo={paths.song(song.id)} title="Structure" />
      {/* Keyed by song so the draft starts fresh, and is not reset by later live updates. */}
      <StructureEditor
        key={song.id}
        song={song}
        sections={sections}
        onSaved={() => navigate(paths.song(song.id))}
      />
    </Page>
  )
}
