import type { Resource, ResourceKind } from '../domain/schemas'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
import { RESOURCE_KIND_LABELS } from './resourceKinds'

const KINDS = Object.keys(RESOURCE_KIND_LABELS) as ResourceKind[]

const input =
  'h-11 w-full rounded-field border border-line bg-surface-2 px-3 text-base text-cream placeholder:text-muted aria-[invalid=true]:border-pink'

/** The validation messages for one link, as React Hook Form reports them. */
export interface LinkErrors {
  label?: { message?: string }
  url?: { message?: string }
}

/**
 * Edits a list of links (label, address, kind). Controlled: the form owns the value. Each row is
 * labelled by its position so a screen reader can tell the inputs apart.
 */
export function LinksField({
  value,
  onChange,
  errors,
}: {
  value: Resource[]
  onChange: (next: Resource[]) => void
  errors?: ReadonlyArray<LinkErrors | undefined>
}) {
  const update = (index: number, patch: Partial<Resource>) =>
    onChange(value.map((link, i) => (i === index ? { ...link, ...patch } : link)))

  return (
    <div role="group" aria-labelledby="links-label">
      <div id="links-label" className="eyebrow">
        Links
      </div>
      {value.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2.5">
          {value.map((link, index) => {
            const error = errors?.[index]
            const n = index + 1
            return (
              <li key={index} className="flex items-start gap-1 rounded-field bg-surface p-2.5">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <input
                    aria-label={`Link ${n} label`}
                    aria-invalid={error?.label ? true : undefined}
                    placeholder="Label, e.g. Official video"
                    autoComplete="off"
                    className={input}
                    value={link.label}
                    onChange={(event) => update(index, { label: event.target.value })}
                  />
                  {error?.label?.message && (
                    <p role="alert" className="text-sm text-pink">
                      {error.label.message}
                    </p>
                  )}
                  <input
                    aria-label={`Link ${n} address`}
                    aria-invalid={error?.url ? true : undefined}
                    placeholder="https://"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    className={input}
                    value={link.url}
                    onChange={(event) => update(index, { url: event.target.value })}
                  />
                  {error?.url?.message && (
                    <p role="alert" className="text-sm text-pink">
                      {error.url.message}
                    </p>
                  )}
                  <select
                    aria-label={`Link ${n} kind`}
                    className={input}
                    value={link.kind}
                    onChange={(event) =>
                      update(index, { kind: event.target.value as ResourceKind })
                    }
                  >
                    {KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {RESOURCE_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </div>
                <IconButton
                  icon="trash"
                  label={`Remove link ${n}`}
                  className="text-muted"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                />
              </li>
            )
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() => onChange([...value, { label: '', url: '', kind: 'other' }])}
        className="mt-1 flex h-11 items-center gap-1.5 px-1 text-sm font-semibold text-orange"
      >
        <Icon name="plus" size={18} />
        Add link
      </button>
    </div>
  )
}
