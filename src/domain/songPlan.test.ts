import { describe, expect, it } from 'vitest'
import { buildPlanPrompt, parseSongPlan, planToRecords, type SongPlan } from './songPlan'

const plan = {
  title: 'Autumn Leaves',
  artist: 'Joseph Kosma',
  tempo: 120,
  chordNotes: 'A  Cm7 F7 BbM7',
  sections: [
    {
      name: 'A',
      notes: 'ii V I in Bb',
      goals: [
        { title: 'A, shells', targetBpm: 80 },
        { title: 'A, rootless', targetBpm: 100, requires: ['A, shells'] },
      ],
    },
    { name: 'B', goals: [{ title: 'B, shells', targetBpm: 80 }] },
  ],
  structure: ['A', 'A', 'B', 'A'],
  goals: [{ title: 'Play it through', targetBpm: 120, requires: ['A, rootless', 'B, shells'] }],
  resources: [{ label: 'Recording', url: 'https://example.com/rec', kind: 'video' }],
}

describe('parseSongPlan', () => {
  it('reads a plan, filling in what was left out', () => {
    const result = parseSongPlan(JSON.stringify(plan))
    expect(result.ok).toBe(true)
    const read = (result as { ok: true; plan: SongPlan }).plan
    expect(read.sections[1].notes).toBe('')
    expect(read.sections[0].goals[0]).toEqual({
      title: 'A, shells',
      description: '',
      targetBpm: 80,
      requires: [],
      resources: [],
    })
  })

  it('finds the JSON inside fences or chatter', () => {
    const chatty = `Here you go:\n\`\`\`json\n${JSON.stringify(plan)}\n\`\`\`\nEnjoy!`
    expect(parseSongPlan(chatty).ok).toBe(true)
    expect(parseSongPlan(`Sure! ${JSON.stringify(plan)} Let me know.`).ok).toBe(true)
  })

  it('explains what is wrong in plain words', () => {
    const error = (text: string) => {
      const result = parseSongPlan(text)
      return result.ok ? '' : result.error
    }
    expect(error('')).toMatch(/paste the reply/i)
    expect(error('not json')).toMatch(/valid JSON/)
    expect(error(JSON.stringify({ ...plan, title: '' }))).toMatch(/incomplete \(title/)
    expect(error(JSON.stringify({ ...plan, tempo: 500 }))).toMatch(/tempo/)
    expect(error(JSON.stringify({ ...plan, structure: ['A', 'Solo'] }))).toMatch(/“Solo”/)
    expect(
      error(JSON.stringify({ ...plan, sections: [plan.sections[0], plan.sections[0]] })),
    ).toMatch(/both called “A”/)
    expect(error(JSON.stringify({ ...plan, goals: [{ title: 'A, shells' }] }))).toMatch(
      /both called “A, shells”/,
    )
    expect(error(JSON.stringify({ ...plan, goals: [{ title: 'X', requires: ['Nope'] }] }))).toMatch(
      /no such goal/,
    )
    expect(error(JSON.stringify({ ...plan, goals: [{ title: 'X', requires: ['X'] }] }))).toMatch(
      /finish itself/,
    )
    const circular = {
      ...plan,
      goals: [
        { title: 'X', requires: ['Y'] },
        { title: 'Y', requires: ['X'] },
      ],
    }
    expect(error(JSON.stringify(circular))).toMatch(/circle: “X”, “Y”/)
    expect(
      error(
        JSON.stringify({ ...plan, resources: [{ label: 'x', url: 'ftp://x', kind: 'video' }] }),
      ),
    ).toMatch(/resources\[0\]\.url/)
  })
})

describe('planToRecords', () => {
  it('turns a plan into a song, its sections in order, and goals linked by id', () => {
    let count = 0
    const parsed = parseSongPlan(JSON.stringify(plan)) as { ok: true; plan: SongPlan }
    const { song, sections, goals } = planToRecords(parsed.plan, {
      now: 1000,
      newId: () => `id-${++count}`,
    })
    expect(song).toMatchObject({
      id: 'id-1',
      title: 'Autumn Leaves',
      tempo: 120,
      structure: ['id-2', 'id-2', 'id-3', 'id-2'],
      resources: plan.resources,
      createdAt: 1000,
    })
    expect(sections.map((s) => [s.id, s.name, s.order, s.songId])).toEqual([
      ['id-2', 'A', 0, 'id-1'],
      ['id-3', 'B', 1, 'id-1'],
    ])
    const byTitle = Object.fromEntries(goals.map((g) => [g.title, g]))
    expect(byTitle['Play it through']).toMatchObject({ sectionId: null, createdAt: 1000 })
    expect(byTitle['A, rootless']).toMatchObject({
      sectionId: 'id-2',
      requires: [byTitle['A, shells'].id],
    })
    expect(byTitle['Play it through'].requires).toEqual([
      byTitle['A, rootless'].id,
      byTitle['B, shells'].id,
    ])
    expect(goals.map((g) => g.createdAt)).toEqual([1000, 1001, 1002, 1003])
  })
})

describe('buildPlanPrompt', () => {
  it('names the song, what it is for and the level, and asks for the plan shape', () => {
    const prompt = buildPlanPrompt({
      title: 'Autumn Leaves',
      artist: 'Joseph Kosma',
      context: 'comping in a jazz trio',
      level: 'intermediate',
    })
    expect(prompt).toContain('Song: Autumn Leaves by Joseph Kosma')
    expect(prompt).toContain('What I’m learning it for: comping in a jazz trio')
    expect(prompt).toContain('My level: intermediate')
    expect(prompt).toContain('"structure"')
    expect(prompt).toContain('never lyrics')
  })

  it('copes with no artist and no context', () => {
    const prompt = buildPlanPrompt({
      title: 'Blue Bossa',
      artist: '',
      context: '',
      level: 'beginner',
    })
    expect(prompt).toContain('Song: Blue Bossa\n')
    expect(prompt).toContain('for: playing it for myself')
  })
})
