import { BottomSheet } from '../../components/BottomSheet'
import { useSongs } from '../../data/hooks'
import { cn } from '../../lib/cn'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentSongId: string
  onPick: (songId: string) => void
}

/** "Practice a different song": a sheet listing every song. */
export function SongPickerSheet({ open, onOpenChange, currentSongId, onPick }: Props) {
  const songs = useSongs()
  const sorted = [...(songs ?? [])].sort((a, b) => a.title.localeCompare(b.title))

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Practice a different song">
      <ul className="mt-4 flex max-h-[50dvh] flex-col gap-1.5 overflow-y-auto">
        {sorted.map((song) => {
          const current = song.id === currentSongId
          return (
            <li key={song.id}>
              <button
                type="button"
                aria-current={current || undefined}
                onClick={() => (current ? onOpenChange(false) : onPick(song.id))}
                className={cn(
                  'block h-16 w-full rounded-row border border-line px-4 text-left hover:bg-surface-2',
                  current && 'bg-surface-2',
                )}
              >
                <span className="block text-base font-semibold">{song.title}</span>
                {song.artist && <span className="block text-[13px] text-muted">{song.artist}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </BottomSheet>
  )
}
