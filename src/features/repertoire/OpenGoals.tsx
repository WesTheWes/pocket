import { Link } from 'react-router'
import { IconLink } from '../../components/IconButton'
import type { Goal, Section, Song } from '../../domain/schemas'
import { paths } from '../../paths'

/** Goals that just opened up (what they needed is done) and have never been tried. */
export function OpenGoals({
  goals,
  songs,
  sections,
}: {
  goals: Goal[]
  songs: Song[]
  sections: Section[]
}) {
  const songTitle = (id: string) => songs.find((song) => song.id === id)?.title ?? ''
  const sectionName = (id: string | null) =>
    id === null ? 'Whole song' : (sections.find((section) => section.id === id)?.name ?? '')
  return (
    <section aria-labelledby="open-goals-heading">
      <div className="flex h-8 items-baseline justify-between">
        <h2 id="open-goals-heading" className="eyebrow">
          Open, not started
        </h2>
      </div>
      <ul className="flex flex-col gap-2">
        {goals.map((goal) => (
          <li
            key={goal.id}
            className="flex items-center gap-3 rounded-row bg-surface py-1.5 pl-4 pr-2.5"
          >
            <span
              aria-hidden="true"
              className="size-7 shrink-0 rounded-full border-2 border-yellow"
            />
            <Link to={paths.goal(goal.songId, goal.id)} className="min-w-0 flex-1 py-2">
              <span className="block truncate text-[15px] font-medium">{goal.title}</span>
              <span className="block text-[13px] text-muted">
                {songTitle(goal.songId)} · {sectionName(goal.sectionId)}
                {goal.targetBpm !== null && ` · target ${goal.targetBpm}`}
              </span>
            </Link>
            <IconLink
              to={paths.practice(goal.songId, goal.id)}
              icon="play"
              variant="tonal"
              label={`Start ${goal.title}`}
              className="size-11"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
