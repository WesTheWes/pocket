import { MissingPage } from '../../components/MissingPage'
import { paths } from '../../paths'

export function GoalNotFound({ songId }: { songId: string }) {
  return <MissingPage title="Goal not found" backTo={paths.goals(songId)} />
}
