import { Link, useParams } from 'react-router'
import { ButtonLink } from '../../components/Button'
import { Tag } from '../../components/Chip'
import { Icon } from '../../components/Icon'
import { IconLink } from '../../components/IconButton'
import { Page } from '../../components/Page'
import { ProgressBar } from '../../components/ProgressBar'
import { SectionRow } from '../../components/SectionRow'
import { TopBar } from '../../components/TopBar'
import { useGoals, useSections, useSong, useSongAttempts } from '../../data/hooks'
import { firstUnfinishedGoal, goalStats, orderGoals, toPercent } from '../../domain/progress'
import { paths } from '../../paths'
import { SongNotFound } from './SongNotFound'

export function SongScreen() {
  const { songId = '' } = useParams()
  const song = useSong(songId)
  const sections = useSections(songId)
  const goals = useGoals(songId)
  const attempts = useSongAttempts(songId)

  // Still loading from IndexedDB.
  if (song === undefined || !sections || !goals || !attempts) return <Page wide />

  if (song === null) return <SongNotFound />

  const overall = goalStats(goals, attempts)
  const percent = toPercent(overall.progress)
  const sectionNames = new Map(sections.map((section) => [section.id, section.name]))

  return (
    <Page wide>
      <div className="desk:hidden">
        <TopBar
          backTo={paths.home}
          right={<IconLink to={paths.editSong(song.id)} icon="edit" label="Edit song" />}
        />
      </div>
      <div className="hidden h-11 items-center justify-between px-20 pt-7 desk:flex">
        <Link
          to={paths.home}
          className="flex h-11 items-center gap-2 text-sm font-medium text-muted"
        >
          <Icon name="back" size={18} />
          Songs
        </Link>
        <IconLink to={paths.editSong(song.id)} icon="edit" label="Edit song" variant="outline" />
      </div>

      <div className="pb-12 desk:mt-5 desk:grid desk:grid-cols-[7fr_5fr] desk:gap-[72px] desk:px-20">
        <div>
          <div className="px-5 pt-2 desk:px-0 desk:pt-0">
            <h1 className="font-display text-[38px] leading-[1.05] desk:text-[68px] desk:leading-[1.02]">
              {song.title}
            </h1>
            {song.artist && (
              <div className="mt-1 text-base text-muted desk:mt-1.5 desk:text-lg">
                {song.artist}
              </div>
            )}
          </div>

          <div className="px-5 pt-5 desk:px-0 desk:pt-7">
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="text-[13px] text-muted desk:text-sm">
                {overall.goalCount === 0
                  ? 'No goals yet'
                  : `${overall.doneCount} of ${overall.goalCount} ${overall.goalCount === 1 ? 'goal' : 'goals'} done`}
              </span>
              <span className="text-[13px] font-semibold tabular-nums desk:text-sm">
                {percent}%
              </span>
            </div>
            <ProgressBar value={overall.progress} label={`${song.title} progress`} size="lg" />
          </div>

          <div className="flex gap-2.5 px-5 pt-5 desk:px-0 desk:pt-6">
            <ButtonLink
              to={paths.practice(song.id)}
              icon="play"
              className="flex-1 desk:w-[200px] desk:flex-none"
            >
              Practice
            </ButtonLink>
            <ButtonLink
              to={paths.goals(song.id)}
              icon="list"
              variant="secondary"
              className="flex-1 desk:w-[200px] desk:flex-none"
            >
              Goals
            </ButtonLink>
          </div>

          <section className="px-5 pt-7 desk:px-0" aria-labelledby="sections-heading">
            <div className="flex h-11 items-center justify-between">
              <h2 id="sections-heading" className="eyebrow">
                Sections
              </h2>
              <AddLink to={paths.newSection(song.id)} />
            </div>
            {sections.length === 0 ? (
              <p className="py-2 text-sm text-muted">
                Break the song into sections like Verse and Chorus, then set goals for each.
              </p>
            ) : (
              <div>
                {sections.map((section) => {
                  const sectionGoals = goals.filter((goal) => goal.sectionId === section.id)
                  const stats = goalStats(sectionGoals, attempts)
                  // Play starts at the section's first unfinished goal.
                  const start = firstUnfinishedGoal(orderGoals(sectionGoals, sections), attempts)
                  return (
                    <SectionRow
                      key={section.id}
                      to={paths.section(song.id, section.id)}
                      name={section.name}
                      goalCount={stats.goalCount}
                      doneCount={stats.doneCount}
                      progress={stats.progress}
                      practiceTo={start && paths.practice(song.id, start.id)}
                    />
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <div>
          <section className="px-5 pt-6 desk:px-0 desk:pt-0" aria-labelledby="structure-heading">
            <div className="flex h-11 items-center justify-between">
              <h2 id="structure-heading" className="eyebrow">
                Structure
              </h2>
              <EditLink to={paths.structure(song.id)} label="Edit structure" />
            </div>
            {song.structure.length === 0 ? (
              <p className="text-sm text-muted">
                Set the order the sections are played to build the song's structure.
              </p>
            ) : (
              <ol className="flex flex-wrap gap-1.5" aria-label="Play order">
                {song.structure.map((sectionId, index) => (
                  <li key={index}>
                    <Tag>{sectionNames.get(sectionId) ?? 'Removed section'}</Tag>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="px-5 pt-6 desk:px-0" aria-labelledby="chords-heading">
            <div className="flex h-11 items-center justify-between">
              <h2 id="chords-heading" className="eyebrow">
                Chord notes
              </h2>
              <EditLink to={paths.editSong(song.id)} label="Edit chord notes" />
            </div>
            <Link
              to={paths.editSong(song.id)}
              className="chord-notes block rounded-row bg-surface p-4"
            >
              {song.chordNotes || (
                <span className="font-sans text-muted">Add chords and notes</span>
              )}
            </Link>
          </section>
        </div>
      </div>
    </Page>
  )
}

function AddLink({ to }: { to: string }) {
  return (
    <Link to={to} className="flex h-11 items-center gap-1.5 px-1 text-sm font-semibold text-orange">
      <Icon name="plus" size={18} />
      Add
    </Link>
  )
}

function EditLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="flex h-11 items-center gap-1.5 px-1 text-sm font-semibold text-orange"
    >
      <Icon name="edit" size={18} />
      Edit
    </Link>
  )
}
