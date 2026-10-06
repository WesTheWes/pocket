import type { Resource } from '../domain/schemas'
import { Icon } from './Icon'
import { RESOURCE_KIND_LABELS } from './resourceKinds'

/** A song's or goal's links, each opening in a new tab. Renders nothing when there are none. */
export function ResourceLinks({ resources, label }: { resources: Resource[]; label: string }) {
  if (resources.length === 0) return null
  return (
    <ul aria-label={label} className="flex flex-col">
      {resources.map((resource, index) => (
        <li key={index}>
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center gap-3 py-1 text-sm"
          >
            <span className="eyebrow w-16 shrink-0">{RESOURCE_KIND_LABELS[resource.kind]}</span>
            <span className="min-w-0 flex-1 truncate text-cream underline decoration-line underline-offset-2">
              {resource.label}
            </span>
            <span className="shrink-0 text-muted">
              <Icon name="chevron" size={16} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
