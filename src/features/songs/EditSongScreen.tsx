import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/BottomSheet'
import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { repos } from '../../data'
import { useGoals, useSections, useSong } from '../../data/hooks'
import { paths } from '../../paths'
import { deleteWarning } from './deleteWarning'
import { SongForm } from './SongForm'
import { SongNotFound } from './SongNotFound'

export function EditSongScreen() {
  const { songId = '' } = useParams()
  const navigate = useNavigate()
  const song = useSong(songId)
  const sections = useSections(songId)
  const goals = useGoals(songId)

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()

  // Still loading from IndexedDB.
  if (song === undefined || !sections || !goals) return <Page />

  if (song === null) {
    // Once the delete has gone through, the song vanishes before we navigate away.
    return deleting ? <Page /> : <SongNotFound />
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(undefined)
    try {
      await repos.songs.delete(songId)
      navigate(paths.home, { replace: true })
    } catch {
      setDeleting(false)
      setDeleteError('Couldn’t delete the song. Please try again.')
    }
  }

  return (
    <Page wide>
      <TopBar backTo={paths.song(song.id)} backLabel={song.title} title="Edit song" />
      <SongForm
        wide
        // Defaults are read once, so live updates never overwrite what is being typed.
        key={song.id}
        defaultValues={{
          title: song.title,
          artist: song.artist,
          chordNotes: song.chordNotes,
          tempo: song.tempo,
          learnedOverride: song.learnedOverride,
        }}
        submitLabel="Save changes"
        showLearned
        onSubmit={async (values) => {
          await repos.songs.update(song.id, values)
          navigate(paths.song(song.id))
        }}
        footer={
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete song
          </Button>
        }
      />
      <ConfirmSheet
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete “${song.title}”?`}
        description={deleteWarning(sections.length, goals.length)}
        confirmLabel="Delete song"
        onConfirm={handleDelete}
        busy={deleting}
        error={deleteError}
      />
    </Page>
  )
}
