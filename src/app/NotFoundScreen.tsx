import { MissingPage } from '../components/MissingPage'
import { paths } from '../paths'

/** Shown for any address that matches no route. */
export function NotFoundScreen() {
  return (
    <MissingPage
      title="Page not found"
      backTo={paths.home}
      message="There is nothing at this address."
    />
  )
}
