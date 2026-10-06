import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { Chip, Tag } from '../../components/Chip'
import { TextAreaField, TextField } from '../../components/Field'
import { Page } from '../../components/Page'
import { useToast } from '../../components/toastContext'
import { TopBar } from '../../components/TopBar'
import { repos } from '../../data'
import {
  buildPlanPrompt,
  parseSongPlan,
  planGoals,
  PLAN_LEVELS,
  type PlanLevel,
  type SongPlan,
} from '../../domain/songPlan'
import { plural } from '../../lib/plural'
import { paths } from '../../paths'

/**
 * Plan a song with an assistant, without the app talking to one: describe the song and what it
 * is for, copy the prompt into any assistant, paste its reply back, check the plan, create the
 * song. Everything the assistant wrote is shown before anything is saved.
 */
export function PlanSongScreen() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [context, setContext] = useState('')
  const [level, setLevel] = useState<PlanLevel>('intermediate')
  const [reply, setReply] = useState('')
  const [copyError, setCopyError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>()

  const prompt = useMemo(
    () => buildPlanPrompt({ title, artist, context, level }),
    [title, artist, context, level],
  )
  const ready = title.trim() !== ''
  const parsed = useMemo(() => (reply.trim() ? parseSongPlan(reply) : null), [reply])

  async function copyPrompt() {
    setCopyError(undefined)
    try {
      await navigator.clipboard.writeText(prompt)
      notify('Prompt copied')
    } catch {
      setCopyError('Couldn’t copy. Open “Show the prompt” below and copy it by hand.')
    }
  }

  async function create(plan: SongPlan) {
    setSaving(true)
    setSaveError(undefined)
    try {
      const song = await repos.songs.createFromPlan(plan)
      notify(`Added ${song.title}`)
      navigate(paths.song(song.id))
    } catch {
      setSaving(false)
      setSaveError('Couldn’t create the song. Nothing was saved.')
    }
  }

  return (
    <Page wide>
      <TopBar backTo={paths.newSong} backLabel="New song" title="Plan a song" />
      <div className="flex flex-col gap-8 px-5 pb-12 pt-2 desk:grid desk:grid-cols-2 desk:items-start desk:gap-x-16 desk:px-20 desk:pb-16 desk:pt-6">
        <div className="flex flex-col gap-8">
          <Step number={1} title="Describe the song">
            <div className="flex flex-col gap-5">
              <TextField
                label="Title"
                placeholder="Song title"
                autoComplete="off"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <TextField
                label="Artist"
                placeholder="Artist"
                autoComplete="off"
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
              />
              <TextAreaField
                label="What are you learning it for?"
                placeholder="e.g. comping in a jazz trio, solo piano at a wedding, singing along"
                className="min-h-[88px] font-sans text-base"
                value={context}
                onChange={(event) => setContext(event.target.value)}
              />
              <div role="group" aria-labelledby="level-label">
                <div id="level-label" className="eyebrow">
                  Your level
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2">
                  {PLAN_LEVELS.map((option) => (
                    <Chip
                      key={option.value}
                      selected={level === option.value}
                      onClick={() => setLevel(option.value)}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </Step>

          <Step number={2} title="Ask an assistant">
            <p className="text-sm text-muted">
              Copy the prompt into Claude, ChatGPT or any assistant that can search the web. It asks
              for sections, goals that build on each other, a chord chart and links, as a plan you
              can paste back here.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Button icon="sparkle" onClick={copyPrompt} disabled={!ready}>
                Copy prompt
              </Button>
              {!ready && <p className="text-[13px] text-muted">Enter a title first.</p>}
              {copyError && (
                <p role="alert" className="text-sm text-pink">
                  {copyError}
                </p>
              )}
            </div>
            <details className="mt-3">
              <summary className="flex h-11 cursor-pointer items-center text-sm font-semibold text-orange">
                Show the prompt
              </summary>
              <TextAreaField
                label="Prompt"
                readOnly
                value={prompt}
                className="min-h-[260px] font-mono text-[13px]"
              />
            </details>
          </Step>
        </div>

        <div className="flex flex-col gap-8">
          <Step number={3} title="Paste the reply">
            <TextAreaField
              label="Paste the reply"
              placeholder="The JSON the assistant replied with"
              spellCheck={false}
              className="min-h-[180px] font-mono text-[13px]"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
            />
            {parsed && !parsed.ok && (
              <p role="alert" className="mt-3 text-sm text-pink">
                {parsed.error}
              </p>
            )}
          </Step>

          {parsed?.ok && (
            <Step number={4} title="Check the plan">
              <PlanPreview plan={parsed.plan} />
              {saveError && (
                <p role="alert" className="mt-3 text-sm text-pink">
                  {saveError}
                </p>
              )}
              <div className="mt-4 flex flex-col gap-2.5">
                <Button icon="plus" disabled={saving} onClick={() => create(parsed.plan)}>
                  Create song
                </Button>
                <p className="text-[13px] text-muted">
                  You can change anything afterwards, like any other song. Chord charts and links
                  from an assistant can be wrong, so check them against the recording.
                </p>
              </div>
            </Step>
          )}
        </div>
      </div>
    </Page>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${number}`}>
      <h2 id={`step-${number}`} className="flex items-baseline gap-2.5 font-display text-2xl">
        <span className="text-muted">{number}</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** What the plan will create, in the app's own terms, so nothing is a surprise after Create. */
function PlanPreview({ plan }: { plan: SongPlan }) {
  const goals = planGoals(plan)
  const links = plan.resources.length + goals.reduce((n, { goal }) => n + goal.resources.length, 0)
  return (
    <section aria-label="Plan preview" className="rounded-card bg-surface p-5">
      <div className="font-display text-[26px] leading-[1.1]">{plan.title}</div>
      <p className="mt-1 text-sm text-muted">
        {[plan.artist, plan.tempo === null ? 'No tempo' : `${plan.tempo} BPM`]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <div className="eyebrow mt-5">Sections</div>
      {plan.sections.length === 0 ? (
        <p className="mt-1 text-sm text-muted">None</p>
      ) : (
        <ul className="mt-1 divide-y divide-line" aria-label="Planned sections">
          {plan.sections.map((section) => (
            <li key={section.name} className="flex items-baseline justify-between gap-3 py-2">
              <span className="font-medium">{section.name}</span>
              <span className="shrink-0 text-[13px] text-muted">
                {plural(section.goals.length, 'goal')}
                {section.notes && ' · notes'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="eyebrow mt-5">Play order</div>
      {plan.structure.length === 0 ? (
        <p className="mt-1 text-sm text-muted">None</p>
      ) : (
        <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="Planned play order">
          {plan.structure.map((name, index) => (
            <li key={index}>
              <Tag>{name}</Tag>
            </li>
          ))}
        </ol>
      )}

      <div className="eyebrow mt-5">Goals</div>
      {goals.length === 0 ? (
        <p className="mt-1 text-sm text-muted">None</p>
      ) : (
        <ol className="mt-1 divide-y divide-line" aria-label="Planned goals">
          {goals.map(({ goal, section }) => (
            <li key={goal.title} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{goal.title}</span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted">
                  {goal.targetBpm === null ? 'No target' : `${goal.targetBpm} BPM`}
                </span>
              </div>
              <div className="mt-0.5 text-[13px] text-muted">
                {section ?? 'Whole song'}
                {goal.requires.length > 0 && ` · after ${goal.requires.join(', ')}`}
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-5 text-[13px] text-muted">
        {plan.chordNotes ? 'Chord chart included' : 'No chord chart'} · {plural(links, 'link')}
      </p>
      <p className="mt-1 text-[13px] text-muted">
        Not what you wanted?{' '}
        <Link to={paths.newSong} className="text-cream underline">
          Start a song by hand
        </Link>{' '}
        instead.
      </p>
    </section>
  )
}
