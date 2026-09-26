export const QUALITY_LEVELS = [1, 2, 3, 4, 5] as const

export type QualityLevel = (typeof QUALITY_LEVELS)[number]

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  1: "Can't play at all",
  2: 'Many mistakes',
  3: 'Few mistakes',
  4: 'Solid',
  5: 'Perfection',
}

/** Every goal is measured against this level. */
export const SOLID: QualityLevel = 4

export function isSolid(level: number): boolean {
  return level >= SOLID
}
