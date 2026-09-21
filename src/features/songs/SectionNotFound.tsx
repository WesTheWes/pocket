import { MissingPage } from '../../components/MissingPage'
import { paths } from '../../paths'

export function SectionNotFound({ songId }: { songId: string }) {
  return <MissingPage title="Section not found" backTo={paths.song(songId)} />
}
