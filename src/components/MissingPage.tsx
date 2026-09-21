import { Page } from './Page'
import { TopBar } from './TopBar'

/** "Not found" for a record that does not exist (or was deleted). */
export function MissingPage({
  title,
  backTo,
  message = 'It may have been deleted.',
}: {
  title: string
  backTo: string
  message?: string
}) {
  return (
    <Page>
      <TopBar backTo={backTo} />
      <div className="px-5 pt-8">
        <h1 className="font-display text-4xl">{title}</h1>
        <p className="mt-2 text-muted">{message}</p>
      </div>
    </Page>
  )
}
