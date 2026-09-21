export const QUALITY_LEVELS = [1, 2, 3, 4, 5] as const

export type QualityLevel = (typeof QUALITY_LEVELS)[number]

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  1: "Can't yet",
  2: 'Rough',
  3: 'Shaky',
  4: 'Solid',
  5: 'Mastered',
}

/** Every goal is measured against this level. */
export const SOLID: QualityLevel = 4

export function isSolid(level: number): boolean {
  return level >= SOLID
}
