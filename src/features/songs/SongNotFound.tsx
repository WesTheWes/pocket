import { MissingPage } from '../../components/MissingPage'
import { paths } from '../../paths'

export function SongNotFound() {
  return <MissingPage title="Song not found" backTo={paths.home} />
}
