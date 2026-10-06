import { requirementCycles } from './prerequisites'
import { pocketDataSchema, type PocketData } from './schemas'

/**
 * The backup file format. Bump `BACKUP_VERSION` when the shape of `data` changes, and teach
 * `parseBackup` to upgrade older versions.
 */
export const BACKUP_VERSION = 5

export interface BackupFile {
  app: 'pocket'
  version: number
  /** When the backup was made, as a timestamp in milliseconds. */
  exportedAt: number
  data: PocketData
}

export function createBackup(data: PocketData, exportedAt: number): BackupFile {
  return { app: 'pocket', version: BACKUP_VERSION, exportedAt, data }
}

/** Readable, indented JSON, so the file can be opened and understood in any text editor. */
export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

/** "pocket-backup-2026-09-21.json", by the local date. */
export function backupFilename(now: number): string {
  const date = new Date(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `pocket-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

export function summarize(data: PocketData) {
  return {
    songs: data.songs.length,
    sections: data.sections.length,
    goals: data.goals.length,
    attempts: data.attempts.length,
    sessions: data.sessions.length,
  }
}

/**
 * Everything that is wrong with how the records refer to each other, in plain words. The schemas
 * check each record on its own; this checks that the pieces fit together, so a damaged or
 * hand-edited file cannot leave a goal pointing at a song that is not there.
 */
export function checkIntegrity(data: PocketData): string[] {
  const problems: string[] = []

  const songIds = new Set(data.songs.map((song) => song.id))
  const sectionSong = new Map(data.sections.map((section) => [section.id, section.songId]))
  const goalIds = new Set(data.goals.map((goal) => goal.id))
  const sessionIds = new Set(data.sessions.map((session) => session.id))

  const duplicates = (kind: string, ids: string[]) => {
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) problems.push(`Duplicate ${kind} id: ${id}.`)
      seen.add(id)
    }
  }
  duplicates(
    'song',
    data.songs.map((s) => s.id),
  )
  duplicates(
    'section',
    data.sections.map((s) => s.id),
  )
  duplicates(
    'goal',
    data.goals.map((g) => g.id),
  )
  duplicates(
    'attempt',
    data.attempts.map((a) => a.id),
  )
  duplicates(
    'session',
    data.sessions.map((s) => s.id),
  )

  for (const section of data.sections) {
    if (!songIds.has(section.songId)) {
      problems.push(
        `Section ${section.id} belongs to a song that isn’t in the backup (${section.songId}).`,
      )
    }
  }

  for (const goal of data.goals) {
    if (!songIds.has(goal.songId)) {
      problems.push(`Goal ${goal.id} belongs to a song that isn’t in the backup (${goal.songId}).`)
    }
    if (goal.sectionId !== null) {
      const owner = sectionSong.get(goal.sectionId)
      if (owner === undefined) {
        problems.push(`Goal ${goal.id} is in section ${goal.sectionId}, which isn’t in the backup.`)
      } else if (owner !== goal.songId) {
        problems.push(
          `Goal ${goal.id} is in section ${goal.sectionId}, which belongs to a different song.`,
        )
      }
    }
  }

  const goalSong = new Map(data.goals.map((goal) => [goal.id, goal.songId]))
  for (const goal of data.goals) {
    for (const required of goal.requires) {
      if (required === goal.id) {
        problems.push(`Goal ${goal.id} requires itself.`)
      } else if (!goalSong.has(required)) {
        problems.push(`Goal ${goal.id} requires goal ${required}, which isn’t in the backup.`)
      } else if (goalSong.get(required) !== goal.songId) {
        problems.push(
          `Goal ${goal.id} requires goal ${required}, which belongs to a different song.`,
        )
      }
    }
  }
  for (const id of requirementCycles(data.goals)) {
    problems.push(`Goal ${id} is in a circle of goals that require each other.`)
  }

  for (const attempt of data.attempts) {
    if (!goalIds.has(attempt.goalId)) {
      problems.push(
        `Attempt ${attempt.id} is for goal ${attempt.goalId}, which isn’t in the backup.`,
      )
    }
    if (attempt.sessionId !== null && !sessionIds.has(attempt.sessionId)) {
      problems.push(
        `Attempt ${attempt.id} is part of session ${attempt.sessionId}, which isn’t in the backup.`,
      )
    }
  }

  for (const session of data.sessions) {
    if (!songIds.has(session.songId)) {
      problems.push(
        `Session ${session.id} is for song ${session.songId}, which isn’t in the backup.`,
      )
    }
  }

  for (const song of data.songs) {
    for (const sectionId of song.structure) {
      const owner = sectionSong.get(sectionId)
      if (owner === undefined) {
        problems.push(
          `The structure of song ${song.id} uses section ${sectionId}, which isn’t in the backup.`,
        )
      } else if (owner !== song.id) {
        problems.push(
          `The structure of song ${song.id} uses section ${sectionId}, which belongs to a different song.`,
        )
      }
    }
  }

  return problems
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

const fail = (error: string): ParseResult => ({ ok: false, error })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** "songs[1].title" from a Zod issue path. */
const describePath = (path: ReadonlyArray<PropertyKey>) =>
  path.reduce<string>(
    (text, key) =>
      typeof key === 'number' ? `${text}[${key}]` : text ? `${text}.${String(key)}` : String(key),
    '',
  )

/**
 * Brings the data of an older backup up to the current shape. Anything unexpected is passed
 * through untouched, for the schema check to reject with a clear reason.
 */
function upgradeData(version: number, data: unknown): unknown {
  let upgraded = data
  // Version 2 gave songs a tempo. Older songs have none.
  if (version < 2 && isRecord(upgraded) && Array.isArray(upgraded.songs)) {
    upgraded = {
      ...upgraded,
      songs: upgraded.songs.map((song: unknown) =>
        isRecord(song) && !('tempo' in song) ? { ...song, tempo: null } : song,
      ),
    }
  }
  // Version 3 gave attempts a note. Older attempts have an empty one.
  if (version < 3 && isRecord(upgraded) && Array.isArray(upgraded.attempts)) {
    upgraded = {
      ...upgraded,
      attempts: upgraded.attempts.map((attempt: unknown) =>
        isRecord(attempt) && !('note' in attempt) ? { ...attempt, note: '' } : attempt,
      ),
    }
  }
  // Version 4 let goals require other goals. Older goals require none.
  if (version < 4 && isRecord(upgraded) && Array.isArray(upgraded.goals)) {
    upgraded = {
      ...upgraded,
      goals: upgraded.goals.map((goal: unknown) =>
        isRecord(goal) && !('requires' in goal) ? { ...goal, requires: [] } : goal,
      ),
    }
  }
  // Version 5 gave songs and goals links. Older records have none.
  if (version < 5 && isRecord(upgraded)) {
    const fill = (records: unknown) =>
      Array.isArray(records)
        ? records.map((record: unknown) =>
            isRecord(record) && !('resources' in record) ? { ...record, resources: [] } : record,
          )
        : records
    upgraded = { ...upgraded, songs: fill(upgraded.songs), goals: fill(upgraded.goals) }
  }
  return upgraded
}

/**
 * Reads the text of a backup file. Never throws: a file that cannot be used comes back with a
 * plain-language reason that can be shown to the person who chose it.
 */
export function parseBackup(text: string): ParseResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return fail('That file isn’t valid JSON, so it can’t be a Pocket backup.')
  }

  if (!isRecord(value) || value.app !== 'pocket') {
    return fail('This isn’t a Pocket backup. It was made by something else.')
  }

  const { version, exportedAt } = value
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail('This backup has no valid version number, so it can’t be read.')
  }
  if (version > BACKUP_VERSION) {
    return fail(
      `This backup was made by a newer version of Pocket (version ${version}). Update Pocket to restore it.`,
    )
  }
  if (typeof exportedAt !== 'number' || !Number.isInteger(exportedAt) || exportedAt < 0) {
    return fail('The backup is damaged (exportedAt: it has no valid date).')
  }

  const parsed = pocketDataSchema.safeParse(upgradeData(version, value.data))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return fail(`The backup is damaged (${describePath(issue.path)}: ${issue.message}).`)
  }

  const problems = checkIntegrity(parsed.data)
  if (problems.length > 0) {
    const shown = problems.slice(0, 3).join(' ')
    const more = problems.length > 3 ? ` (and ${problems.length - 3} more)` : ''
    return fail(`The backup is inconsistent. ${shown}${more}`)
  }

  // Upgraded above, so the data is now in the current version's shape.
  return {
    ok: true,
    backup: { app: 'pocket', version: BACKUP_VERSION, exportedAt, data: parsed.data },
  }
}

export interface MergeResult {
  /** What to add: the missing songs and everything that belongs to them. */
  additions: PocketData
  added: number
  skipped: number
}

/**
 * Works out what to add to a device that already has the songs in `existingSongIds`. A song the
 * device has is left entirely alone (its sections, goals and history are not touched); a song it
 * lacks comes across whole. Nothing is ever overwritten.
 */
export function mergeMissing(
  existingSongIds: ReadonlySet<string>,
  incoming: PocketData,
): MergeResult {
  const songs = incoming.songs.filter((song) => !existingSongIds.has(song.id))
  const songIds = new Set(songs.map((song) => song.id))

  const goals = incoming.goals.filter((goal) => songIds.has(goal.songId))
  const goalIds = new Set(goals.map((goal) => goal.id))

  return {
    additions: {
      songs,
      sections: incoming.sections.filter((section) => songIds.has(section.songId)),
      goals,
      attempts: incoming.attempts.filter((attempt) => goalIds.has(attempt.goalId)),
      sessions: incoming.sessions.filter((session) => songIds.has(session.songId)),
    },
    added: songs.length,
    skipped: incoming.songs.length - songs.length,
  }
}
