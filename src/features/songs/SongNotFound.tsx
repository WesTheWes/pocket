import { Page } from '../../components/Page'
import { TopBar } from '../../components/TopBar'
import { paths } from '../../paths'

export function SongNotFound() {
  return (
    <Page>
      <TopBar backTo={paths.home} />
      <div className="px-5 pt-8">
        <h1 className="font-display text-4xl">Song not found</h1>
        <p className="mt-2 text-muted">It may have been deleted.</p>
      </div>
    </Page>
  )
}
