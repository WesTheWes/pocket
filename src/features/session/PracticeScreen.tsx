import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { IconButton, IconLink } from '../../components/IconButton'
import { MetronomePanel } from '../../components/MetronomePanel'
import { Page } from '../../components/Page'
import { ProgressBar } from '../../components/ProgressBar'
import { repos } from '../../data'
import { useActiveSession, useGoals, useSections, useSong, useSongAttempts } from '../../data/hooks'
import { goalSummary } from '../../domain/goalSummary'
import { latestNote } from '../../domain/notes'
import {
  averageProgress,
  firstUnfinishedGoal,
  goalProgress,
  lockReason,
  orderGoals,
  toPercent,
} from '../../domain/progress'
import type { Attempt, Goal, Section, Session, Song } from '../../domain/schemas'
import { SUBDIVISIONS } from '../../domain/subdivision'
import { cn } from '../../lib/cn'
import { formatTimeAgo } from '../../lib/formatDate'
import { formatDuration } from '../../lib/formatDuration'
import { withReturn } from '../../lib/returnTo'
import { useStoredChoice } from '../../lib/useStoredChoice'
import { paths } from '../../paths'
import { groupGoals } from '../goals/groups'
import { SongNotFound } from '../songs/SongNotFound'
import {
  EditMenuSheet,
  SectionSheet,
  SongSheet,
  StructureSheet,
  type EditSheetKind,
} from './EditSheets'
import { GoalSheet, type GoalSheetTarget } from './GoalSheet'
import { GoalStatus } from './GoalStatus'
import { PracticeNotes } from './PracticeNotes'
import { SongPickerSheet } from './SongPickerSheet'
import { chooseTempo, recallTempo, rememberTempo } from './tempoMemory'
import { useMetronome } from './useMetronome'
import { useSessionTimer } from './useSessionTimer'

/** Metronome tempo when a song has no goals to start from. */
const FREE_PLAY_BPM = 80

/** Keyed by song, so switching songs starts with fresh state. */
export function PracticeRoute() {
  const { songId = '' } = useParams()
  return <PracticeScreen key={songId} songId={songId} />
}

function PracticeScreen({ songId }: { songId: string }) {
  const navigate = useNavigate()
  const song = useSong(songId)
  const sections = useSections(songId)
  const goals = useGoals(songId)
  const attempts = useSongAttempts(songId)
  const session = useActiveSession(songId)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string>()
  const songExists = !!song

  // Whenever the song has no open session, start one. Atomic, so StrictMode's doubled effects
  // and a reload both land on the same session, and the timer carries on.
  useEffect(() => {
    if (songExists && session === null && !leaving) {
      repos.sessions.startOrResume(songId).catch(() => setError('Couldn’t start a session.'))
    }
  }, [songExists, session, leaving, songId])

  async function leave(then: () => void) {
    if (!session) return
    setLeaving(true)
    setError(undefined)
    try {
      await repos.sessions.end(session.id)
      then()
    } catch {
      setLeaving(false)
      setError('Couldn’t finish the session. Please try again.')
    }
  }

  // Still loading from IndexedDB.
  if (song === undefined || !sections || !goals || !attempts || session === undefined) {
    return <Page wide />
  }
  if (song === null) return <SongNotFound />
  // Being started (or restarted after the last one ended).
  if (session === null) return <Page wide />

  return (
    <PracticeView
      song={song}
      sections={sections}
      goals={goals}
      attempts={attempts}
      session={session}
      leaving={leaving}
      error={error}
      onFinish={() => leave(() => navigate(paths.review(song.id, session.id)))}
      onSwitch={(otherId) => leave(() => navigate(paths.practice(otherId)))}
    />
  )
}

interface ViewProps {
  song: Song
  sections: Section[]
  goals: Goal[]
  attempts: Attempt[]
  session: Session
  leaving: boolean
  error?: string
  onFinish: () => void
  onSwitch: (songId: string) => void
}

function PracticeView({
  song,
  sections,
  goals,
  attempts,
  session,
  leaving,
  error,
  onFinish,
  onSwitch,
}: ViewProps) {
  const [search, setSearch] = useSearchParams()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [goalSheet, setGoalSheet] = useState<GoalSheetTarget | null>(null)
  const [editSheet, setEditSheet] = useState<EditSheetKind | null>(null)
  const elapsed = useSessionTimer(session)
  const paused = session.pausedAt !== null

  const ordered = useMemo(() => orderGoals(goals, sections), [goals, sections])
  const groups = groupGoals(goals, sections, attempts, 'all').filter((g) => g.goals.length > 0)

  // The goal comes from the URL, so a reload keeps your place; otherwise start at the first
  // one that is not done yet.
  const requested = ordered.findIndex((goal) => goal.id === search.get('goal'))
  const fallback = ordered.findIndex(
    (goal) => goal.id === firstUnfinishedGoal(ordered, attempts)?.id,
  )
  const index = requested >= 0 ? requested : Math.max(0, fallback)
  const goal: Goal | undefined = ordered[index]
  const currentGroup = groups.find((group) => group.goals.some((g) => g.id === goal?.id))
  const previous = ordered[index - 1]
  const next = ordered[index + 1]
  const select = (id: string) => setSearch({ goal: id }, { replace: true })

  // Landing on a goal sets the metronome to the tempo you last set for it in this session, unless
  // you have logged a tempo since (see chooseTempo). State is adjusted during render (React's
  // pattern for "reset when a prop changes") so there is no frame with the old tempo.
  const goalKey = goal?.id ?? null
  const startBpm = () =>
    goal
      ? chooseTempo(recallTempo(session.id, goalKey), goal, attempts)
      : (recallTempo(session.id, null)?.bpm ?? FREE_PLAY_BPM)
  const [tempo, setTempo] = useState(() => ({ goalKey, bpm: startBpm() }))
  if (tempo.goalKey !== goalKey) setTempo({ goalKey, bpm: startBpm() })
  const bpm = tempo.bpm
  const changeBpm = (next: number) => {
    setTempo({ goalKey, bpm: next })
    rememberTempo(session.id, goalKey, next, Date.now())
  }
  const [subdivision, setSubdivision] = useStoredChoice(
    'pocket:metronome:subdivision',
    SUBDIVISIONS,
    'quarter',
  )
  const metronome = useMetronome(bpm, subdivision)

  const currentSection = goal ? sections.find((s) => s.id === goal.sectionId) : undefined
  // What you wrote last time about this goal, so it is in front of you when you come back.
  // `now` only dates that note; session time never comes from here.
  const lastNote = goal ? latestNote(goal.id, attempts) : null
  const [now] = useState(() => Date.now())
  const sectionName = currentSection?.name
  const sectionLabel = (g: Goal) => sections.find((s) => s.id === g.sectionId)?.name ?? 'Whole song'

  return (
    <Page wide className="desk:h-dvh desk:flex-row">
      <aside className="flex flex-wrap items-center gap-x-3 px-5 pt-5 desk:w-[380px] desk:shrink-0 desk:flex-col desk:flex-nowrap desk:items-stretch desk:gap-[18px] desk:border-r desk:border-line desk:bg-surface desk:p-6">
        <div className="order-1 flex min-w-0 flex-1 items-center gap-2.5 desk:order-1 desk:w-full desk:flex-none">
          <div className="hidden desk:block">
            <IconLink to={paths.home} icon="back" label="Back to songs" />
          </div>
          <button
            type="button"
            aria-label="Change song"
            onClick={() => setPickerOpen(true)}
            className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full border border-line bg-surface px-4 text-left desk:bg-surface-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{song.title}</span>
              {song.artist && <span className="block text-xs text-muted">{song.artist}</span>}
            </span>
            <Icon name="down" size={18} />
          </button>
          <IconButton
            icon="more"
            variant="outline"
            label="Edit song, sections and structure"
            onClick={() => setEditSheet('menu')}
          />
        </div>

        <Button
          aria-label="Finish practice"
          onClick={onFinish}
          disabled={leaving}
          className="order-2 h-11 px-5 text-[15px] desk:order-4 desk:h-[52px] desk:w-full"
        >
          <span aria-hidden="true" className="desk:hidden">
            Finish
          </span>
          <span aria-hidden="true" className="hidden desk:inline">
            Finish practice
          </span>
        </Button>

        <div className="order-3 flex w-full items-center justify-between px-1 pt-5 desk:order-2 desk:pt-0">
          <div>
            <div id="timer-label" className="eyebrow">
              Practice time
            </div>
            <div
              role="timer"
              aria-labelledby="timer-label"
              className="mt-0.5 text-[40px] font-medium leading-[1.1] tabular-nums desk:text-[44px]"
            >
              {formatDuration(elapsed)}
            </div>
          </div>
          <button
            type="button"
            aria-label={paused ? 'Resume timer' : 'Pause timer'}
            onClick={() =>
              paused ? repos.sessions.resume(session.id) : repos.sessions.pause(session.id)
            }
            className="flex size-12 items-center justify-center rounded-full border border-line bg-surface hover:bg-surface-2 desk:bg-surface-2"
          >
            <Icon name={paused ? 'play' : 'pause'} size={20} />
          </button>
        </div>

        <nav
          aria-label="Goals"
          className="order-5 hidden min-h-0 flex-1 flex-col gap-1 overflow-y-auto desk:order-3 desk:flex"
        >
          <div className="eyebrow px-1 pb-1">Goals</div>
          {ordered.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-current={g.id === goal?.id ? 'true' : undefined}
              onClick={() => select(g.id)}
              className={cn(
                'flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3.5 py-1.5 text-left hover:bg-surface-2',
                g.id === goal?.id && 'bg-surface-2',
              )}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-xs font-semibold uppercase tracking-[0.06em]',
                    g.id === goal?.id ? 'text-orange' : 'text-muted',
                  )}
                >
                  {sectionLabel(g)}
                </span>
                <span className="block truncate text-[15px] font-medium">{g.title}</span>
              </span>
              <GoalStatus goal={g} goals={goals} attempts={attempts} />
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col desk:overflow-y-auto desk:px-16 desk:py-8">
        {error && (
          <p role="alert" className="px-5 pt-3 text-sm text-pink">
            {error}
          </p>
        )}

        {groups.length > 0 && (
          <div
            role="group"
            aria-label="Sections"
            className="grid grid-cols-3 gap-1.5 px-5 pt-3 desk:flex desk:gap-2 desk:px-0 desk:pt-0"
          >
            {groups.map((group) => {
              const active = group.goals.some((g) => g.id === goal?.id)
              const progress = averageProgress(group.goals, attempts)
              return (
                <button
                  key={group.key}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${group.title}, ${toPercent(progress)}% complete`}
                  onClick={() => select(group.goals[0].id)}
                  className={cn(
                    'flex h-[46px] min-w-0 flex-col justify-center gap-[7px] rounded-[14px] border px-3 text-left text-[13px] font-medium desk:max-w-[150px] desk:flex-1 desk:text-sm',
                    active ? 'border-cream bg-cream text-ink' : 'border-line',
                  )}
                >
                  <span className="block truncate">{group.title}</span>
                  <span
                    className={cn(
                      'block h-1 overflow-hidden rounded-full',
                      active ? 'bg-ink/20' : 'bg-surface-2',
                    )}
                  >
                    <span
                      className={cn('block h-full rounded-full', active ? 'bg-ink' : 'bg-orange')}
                      style={{ width: `${toPercent(progress)}%` }}
                    />
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {currentGroup && currentGroup.goals.length > 1 && (
          <nav
            aria-label={`Goals in ${currentGroup.title}`}
            className="mx-5 mt-2 flex max-h-[148px] flex-col gap-1 overflow-y-auto desk:hidden"
          >
            {currentGroup.goals.map((g) => {
              const isCurrent = g.id === goal?.id
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => select(g.id)}
                  className={cn(
                    'flex h-11 items-center gap-3 rounded-xl px-3.5 text-left text-[15px]',
                    isCurrent ? 'bg-surface-2 font-medium' : 'text-muted hover:bg-surface',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{g.title}</span>
                  <GoalStatus goal={g} goals={goals} attempts={attempts} />
                </button>
              )
            })}
          </nav>
        )}

        <section
          aria-label="Current goal"
          className="mx-5 mt-3 rounded-card bg-surface p-[18px] desk:mx-0 desk:mt-3 desk:rounded-[24px] desk:px-8 desk:py-7"
        >
          {goal ? (
            <>
              <div className="flex items-center justify-between">
                <div className="eyebrow">
                  {sectionName ?? 'Whole song'} · Goal {index + 1} of {ordered.length}
                </div>
                <div className="-my-2.5 -mr-2 flex items-center">
                  <Link
                    to={paths.goal(song.id, goal.id)}
                    state={withReturn(paths.practice(song.id, goal.id), { bpm })}
                    className="flex h-11 items-center px-1.5 text-[13px] font-semibold text-orange desk:text-sm"
                  >
                    Log attempt
                  </Link>
                  <IconButton
                    icon="edit"
                    label="Edit goal"
                    className="text-muted"
                    onClick={() => setGoalSheet({ mode: 'edit', goal })}
                  />
                </div>
              </div>
              <h1 className="mt-1 font-display text-[27px] leading-[1.12] desk:mt-1.5 desk:text-[44px] desk:leading-[1.08]">
                {goal.title}
              </h1>
              {goal.description && (
                <p className="mt-1.5 text-sm text-muted desk:mt-2 desk:text-base">
                  {goal.description}
                </p>
              )}
              {lockReason(goal, goals, attempts) && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted desk:text-base">
                  <Icon name="lock" size={14} />
                  {lockReason(goal, goals, attempts)}
                </p>
              )}
              <div className="mt-4 desk:mt-[22px]">
                <ProgressBar value={goalProgress(goal, attempts)} label="Goal progress" size="lg" />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 truncate text-[13px] text-muted desk:text-sm">
                    {goalSummary(goal, attempts)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setGoalSheet({ mode: 'add', sectionId: goal.sectionId })}
                    className="-my-3 -mr-1 flex h-11 shrink-0 items-center gap-1 px-1 text-[13px] font-semibold text-orange desk:text-sm"
                  >
                    <Icon name="plus" size={16} />
                    Add goal
                  </button>
                </div>
              </div>
              {lastNote && (
                <p className="mt-3 text-sm leading-[1.5] text-muted desk:mt-4 desk:text-base">
                  <span className="font-semibold text-cream">
                    Last note · {formatTimeAgo(lastNote.at, now).toLowerCase()}
                  </span>{' '}
                  {lastNote.note}
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="font-display text-[27px] leading-[1.12]">Free practice</h1>
              <p className="mt-1.5 text-sm text-muted">
                This song has no goals yet. Add some to track progress, or just use the metronome.
              </p>
              <button
                type="button"
                onClick={() => setGoalSheet({ mode: 'add', sectionId: null })}
                className="mt-3 inline-flex h-11 items-center text-sm font-semibold text-orange"
              >
                Add a goal
              </button>
            </>
          )}
        </section>

        <PracticeNotes
          sectionName={sectionName}
          sectionNotes={currentSection?.notes ?? ''}
          chordNotes={song.chordNotes}
        />

        <div className="mt-1 desk:mt-4">
          <MetronomePanel
            bpm={bpm}
            onBpmChange={changeBpm}
            playing={metronome.playing}
            onToggle={metronome.toggle}
            beat={metronome.beat}
            supported={metronome.supported}
            subdivision={subdivision}
            onSubdivisionChange={setSubdivision}
          />
        </div>

        {goal && (
          <div className="sticky bottom-0 z-10 mt-auto flex gap-2.5 border-t border-line bg-canvas px-5 pb-6 pt-3 desk:static desk:mt-6 desk:border-0 desk:bg-transparent desk:px-0 desk:pb-0 desk:pt-0">
            <Button
              variant="secondary"
              disabled={!previous}
              onClick={() => previous && select(previous.id)}
              className="h-[52px] flex-1 whitespace-nowrap px-3! text-[15px]"
            >
              <Icon name="back" size={18} />
              Prev goal
            </Button>
            {/* Room for the play button, which is pinned over this bar on phones. */}
            <div aria-hidden="true" className="w-[72px] shrink-0 desk:hidden" />
            <Button
              variant="secondary"
              disabled={!next}
              onClick={() => next && select(next.id)}
              className="h-[52px] flex-1 whitespace-nowrap px-3! text-[15px]"
            >
              Next goal
              <Icon name="chevron" size={18} />
            </Button>
          </div>
        )}
      </div>

      <GoalSheet
        target={goalSheet}
        song={song}
        sections={sections}
        goals={goals}
        onClose={() => setGoalSheet(null)}
        onSaved={(saved) => {
          setGoalSheet(null)
          // A new goal is what you were about to work on; an edited one is already showing.
          if (goalSheet?.mode === 'add') select(saved.id)
        }}
      />

      <EditMenuSheet
        open={editSheet === 'menu'}
        onOpenChange={(open) => !open && setEditSheet(null)}
        sectionName={sectionName}
        onPick={setEditSheet}
      />
      <SongSheet open={editSheet === 'song'} song={song} onClose={() => setEditSheet(null)} />
      <SectionSheet
        open={editSheet === 'section'}
        songId={song.id}
        section={currentSection}
        onClose={() => setEditSheet(null)}
      />
      <SectionSheet
        open={editSheet === 'newSection'}
        songId={song.id}
        onClose={() => setEditSheet(null)}
      />
      <StructureSheet
        open={editSheet === 'structure'}
        song={song}
        sections={sections}
        onClose={() => setEditSheet(null)}
        onAddSection={() => setEditSheet('newSection')}
      />
      <SongPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentSongId={song.id}
        onPick={(id) => {
          setPickerOpen(false)
          onSwitch(id)
        }}
      />
    </Page>
  )
}
