import type { ResourceKind } from '../domain/schemas'

/** How each kind of link is labelled in the UI. */
export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  video: 'Video',
  lesson: 'Lesson',
  exercise: 'Exercise',
  other: 'Link',
}
