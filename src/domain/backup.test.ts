import { describe, expect, it } from 'vitest'
import { makeAttempt, makeGoal, makeSection, makeSession, makeSong } from '../test/factories'
import {
  backupFilename,
  checkIntegrity,
  createBackup,
  mergeMissing,
  parseBackup,
  serializeBackup,
  summarize,
} from './backup'
import type { PocketData } from './schemas'

/** Two songs, each with sections, goals, an attempt and a session. All references line up. */
function sampleData(): PocketData {
  return {
    songs: [
      makeSong({ id: 's1', title: 'One', structure: ['a1', 'a2', 'a1'] }),
      makeSong({ id: 's2', title: 'Two', structure: ['b1'] }),
    ],
    sections: [
      makeSection({ id: 'a1', songId: 's1', order: 0 }),
      makeSection({ id: 'a2', songId: 's1', order: 1 }),
      makeSection({ id: 'b1', songId: 's2', order: 0 }),
    ],
    goals: [
      makeGoal({ id: 'g1', songId: 's1', sectionId: 'a1' }),
      makeGoal({ id: 'g2', songId: 's1', sectionId: null }),
      makeGoal({ id: 'g3', songId: 's2', sectionId: 'b1' }),
    ],
    attempts: [
      makeAttempt({ id: 't1', goalId: 'g1', sessionId: 'x1' }),
      makeAttempt({ id: 't2', goalId: 'g3', sessionId: null }),
    ],
    sessions: [makeSession({ id: 'x1', songId: 's1', endedAt: 5000 })],
  }
}

const backupText = (data = sampleData()) => serializeBackup(createBackup(data, 1_700_000_000_000))

describe('createBackup and serializeBackup', () => {
  it('wraps the data with a header saying what it is and when it was made', () => {
    const backup = createBackup(sampleData(), 123)
    expect(backup).toMatchObject({ app: 'pocket', version: 2, exportedAt: 123 })
    expect(backup.data.songs).toHaveLength(2)
  })

  it('writes readable, indented JSON', () => {
    const text = backupText()
    expect(text).toContain('\n  "app": "pocket"')
    expect(JSON.parse(text).data.goals).toHaveLength(3)
  })
})

describe('backupFilename', () => {
  it('names the file by the local date', () => {
    expect(backupFilename(new Date(2026, 8, 21, 23, 59).getTime())).toBe(
      'pocket-backup-2026-09-21.json',
    )
    expect(backupFilename(new Date(2026, 0, 5, 0, 1).getTime())).toBe(
      'pocket-backup-2026-01-05.json',
    )
  })
})

describe('summarize', () => {
  it('counts each kind of record', () => {
    expect(summarize(sampleData())).toEqual({
      songs: 2,
      sections: 3,
      goals: 3,
      attempts: 2,
      sessions: 1,
    })
  })
})

describe('parseBackup', () => {
  it('reads back what was written, exactly', () => {
    const data = sampleData()
    const result = parseBackup(backupText(data))
    expect(result).toEqual({
      ok: true,
      backup: { app: 'pocket', version: 2, exportedAt: 1_700_000_000_000, data },
    })
  })

  it('reads an empty backup', () => {
    const empty = { songs: [], sections: [], goals: [], attempts: [], sessions: [] }
    expect(parseBackup(backupText(empty)).ok).toBe(true)
  })

  it('refuses text that is not JSON', () => {
    const result = parseBackup('this is not json {')
    expect(result).toMatchObject({ ok: false })
    expect(!result.ok && result.error).toMatch(/isn.t valid JSON/)
  })

  it('refuses an empty file', () => {
    expect(parseBackup('').ok).toBe(false)
    expect(parseBackup('   \n').ok).toBe(false)
  })

  it('refuses JSON that is not a Pocket backup', () => {
    for (const text of [
      '[]',
      '42',
      'null',
      '{"hello":"world"}',
      '{"app":"other","version":1,"data":{}}',
    ]) {
      const result = parseBackup(text)
      expect(result.ok).toBe(false)
      expect(!result.ok && result.error).toMatch(/isn.t a Pocket backup/)
    }
  })

  it('refuses a backup from a newer version, saying so', () => {
    const newer = JSON.stringify({ ...JSON.parse(backupText()), version: 3 })
    const result = parseBackup(newer)
    expect(!result.ok && result.error).toMatch(/newer version/)
  })

  it('upgrades a version 1 backup, whose songs have no tempo', () => {
    const data = sampleData()
    const old = JSON.parse(backupText(data))
    old.version = 1
    for (const song of old.data.songs) delete song.tempo
    const result = parseBackup(JSON.stringify(old))
    expect(result).toEqual({
      ok: true,
      backup: { app: 'pocket', version: 2, exportedAt: 1_700_000_000_000, data },
    })
  })

  it('still refuses a current backup whose songs have no tempo', () => {
    const current = JSON.parse(backupText())
    delete current.data.songs[0].tempo
    expect(parseBackup(JSON.stringify(current)).ok).toBe(false)
  })

  it('refuses a version that makes no sense', () => {
    for (const version of [0, -1, 1.5, 'one', null]) {
      const text = JSON.stringify({ ...JSON.parse(backupText()), version })
      expect(parseBackup(text).ok).toBe(false)
    }
  })

  it('refuses damaged data, pointing at where', () => {
    const backup = JSON.parse(backupText())
    backup.data.songs[1].title = ''
    const result = parseBackup(JSON.stringify(backup))
    expect(!result.ok && result.error).toMatch(/damaged/)
    expect(!result.ok && result.error).toContain('songs[1].title')
  })

  it('refuses a missing table', () => {
    const backup = JSON.parse(backupText())
    delete backup.data.attempts
    const result = parseBackup(JSON.stringify(backup))
    expect(!result.ok && result.error).toContain('attempts')
  })

  it('refuses a tempo outside the allowed range', () => {
    const backup = JSON.parse(backupText())
    backup.data.attempts[0].bpm = 999
    expect(parseBackup(JSON.stringify(backup)).ok).toBe(false)
  })

  it('refuses data whose pieces do not fit together, saying what is wrong', () => {
    const backup = JSON.parse(backupText())
    backup.data.goals[0].songId = 'nowhere'
    const result = parseBackup(JSON.stringify(backup))
    expect(!result.ok && result.error).toMatch(/inconsistent/)
    expect(!result.ok && result.error).toContain('nowhere')
  })
})

describe('checkIntegrity', () => {
  it('finds nothing wrong with consistent data', () => {
    expect(checkIntegrity(sampleData())).toEqual([])
  })

  it('finds a duplicate id', () => {
    const data = sampleData()
    data.songs.push(makeSong({ id: 's1' }))
    expect(checkIntegrity(data).join('\n')).toMatch(/duplicate.*s1/i)
  })

  it('finds a section for a missing song', () => {
    const data = sampleData()
    data.sections.push(makeSection({ id: 'z', songId: 'ghost' }))
    expect(checkIntegrity(data).join('\n')).toMatch(/section.*ghost/i)
  })

  it('finds a goal for a missing song, or in a section of another song', () => {
    const missingSong = sampleData()
    missingSong.goals[0].songId = 'ghost'
    expect(checkIntegrity(missingSong).join('\n')).toMatch(/goal.*ghost/i)

    const wrongSection = sampleData()
    wrongSection.goals[0].sectionId = 'b1' // belongs to song s2, goal is in s1
    expect(checkIntegrity(wrongSection).join('\n')).toMatch(/goal.*section/i)

    const noSection = sampleData()
    noSection.goals[0].sectionId = 'nope'
    expect(checkIntegrity(noSection).join('\n')).toMatch(/goal.*nope/i)
  })

  it('finds an attempt for a missing goal or session', () => {
    const noGoal = sampleData()
    noGoal.attempts[0].goalId = 'ghost'
    expect(checkIntegrity(noGoal).join('\n')).toMatch(/attempt.*ghost/i)

    const noSession = sampleData()
    noSession.attempts[0].sessionId = 'ghost'
    expect(checkIntegrity(noSession).join('\n')).toMatch(/attempt.*session.*ghost/i)
  })

  it('finds a session for a missing song', () => {
    const data = sampleData()
    data.sessions[0].songId = 'ghost'
    expect(checkIntegrity(data).join('\n')).toMatch(/session.*ghost/i)
  })

  it('finds a structure slot that points at a missing section, or another song’s', () => {
    const missing = sampleData()
    missing.songs[0].structure.push('nope')
    expect(checkIntegrity(missing).join('\n')).toMatch(/structure.*nope/i)

    const foreign = sampleData()
    foreign.songs[0].structure.push('b1')
    expect(checkIntegrity(foreign).join('\n')).toMatch(/structure.*b1/i)
  })

  it('reports each kind of problem rather than only the first', () => {
    const data = sampleData()
    data.goals[0].songId = 'ghost1'
    data.sessions[0].songId = 'ghost2'
    expect(checkIntegrity(data).length).toBeGreaterThanOrEqual(2)
  })
})

describe('mergeMissing', () => {
  it('adds every song the device does not have, with everything that belongs to it', () => {
    const { additions, added, skipped } = mergeMissing(new Set(), sampleData())
    expect(added).toBe(2)
    expect(skipped).toBe(0)
    expect(summarize(additions)).toEqual(summarize(sampleData()))
  })

  it('leaves alone a song the device already has, along with all its parts', () => {
    const { additions, added, skipped } = mergeMissing(new Set(['s1']), sampleData())
    expect(added).toBe(1)
    expect(skipped).toBe(1)
    expect(additions.songs.map((s) => s.id)).toEqual(['s2'])
    expect(additions.sections.map((s) => s.id)).toEqual(['b1'])
    expect(additions.goals.map((g) => g.id)).toEqual(['g3'])
    expect(additions.attempts.map((a) => a.id)).toEqual(['t2'])
    expect(additions.sessions).toEqual([])
  })

  it('adds nothing when the device has every song', () => {
    const { additions, added, skipped } = mergeMissing(new Set(['s1', 's2']), sampleData())
    expect(added).toBe(0)
    expect(skipped).toBe(2)
    expect(summarize(additions)).toEqual({
      songs: 0,
      sections: 0,
      goals: 0,
      attempts: 0,
      sessions: 0,
    })
  })

  it('keeps an added song’s attempts tied to their session', () => {
    const { additions } = mergeMissing(new Set(['s2']), sampleData())
    expect(additions.sessions.map((s) => s.id)).toEqual(['x1'])
    expect(additions.attempts.find((a) => a.id === 't1')?.sessionId).toBe('x1')
  })

  it('does not change what it was given', () => {
    const data = sampleData()
    const before = JSON.stringify(data)
    mergeMissing(new Set(['s1']), data)
    expect(JSON.stringify(data)).toBe(before)
  })
})
