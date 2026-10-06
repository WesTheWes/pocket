import { ButtonLink } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { ProgressBar } from '../../components/ProgressBar'
import type { Suggestion } from '../../domain/suggest'
import { withReturn } from '../../lib/returnTo'
import { paths } from '../../paths'

const list = (titles: string[]) =>
  titles.length === 1
    ? titles[0]
    : `${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]}`

/** One goal to start on, with why, what you wrote last time, and what finishing it opens. */
export function StartHere({ suggestion }: { suggestion: Suggestion }) {
  const { song, goal, section, progress, reason, step, unlocks, lastNote } = suggestion
  return (
    <section
      aria-labelledby="start-here-heading"
      className="flex flex-col gap-3.5 rounded-card bg-surface p-5"
    >
      <h2
        id="start-here-heading"
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-orange"
      >
        <Icon name="sparkle" size={14} />
        Start here
      </h2>
      <div>
        <div className="text-[13px] text-muted">
          {song.title} · {section?.name ?? 'Whole song'}
        </div>
        <div className="mt-1 font-display text-[27px] leading-[1.12]">{goal.title}</div>
      </div>
      <div>
        <ProgressBar value={progress} label={`${goal.title} progress`} size="lg" />
        <div className="mt-2 text-[13px] text-muted">{reason}</div>
      </div>
      <p className="text-sm leading-[1.45] text-muted">
        {lastNote && <>Last time you wrote: “{lastNote.note}” </>}
        {step.text}
        {unlocks.length > 0 && ` Finishing it opens ${list(unlocks.map((g) => g.title))}.`}
      </p>
      <ButtonLink
        to={paths.practice(song.id, goal.id)}
        state={withReturn(paths.home, { bpm: step.bpm })}
        icon="play"
      >
        Start at {step.bpm} BPM
      </ButtonLink>
    </section>
  )
}
