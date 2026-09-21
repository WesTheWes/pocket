import { Page } from '../components/Page'
import { TopBar } from '../components/TopBar'
import { paths } from '../paths'

/** Stands in for a screen that is designed but not built yet, so its links do not dead-end. */
export function ComingSoon({ screen }: { screen: string }) {
  return (
    <Page>
      <TopBar backTo={paths.home} />
      <div className="px-5 pt-8">
        <h1 className="font-display text-4xl">{screen}</h1>
        <p className="mt-2 text-muted">This screen is designed but not built yet.</p>
      </div>
    </Page>
  )
}

export function NotFoundScreen() {
  return (
    <Page>
      <TopBar backTo={paths.home} />
      <div className="px-5 pt-8">
        <h1 className="font-display text-4xl">Page not found</h1>
        <p className="mt-2 text-muted">There is nothing at this address.</p>
      </div>
    </Page>
  )
}
