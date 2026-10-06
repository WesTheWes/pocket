import { practiceTimeSince } from '../../domain/stats'
import type { Session } from '../../domain/schemas'
import { streakDays, weekDays, weekStart } from '../../domain/week'
import { cn } from '../../lib/cn'
import { formatMinutes } from '../../lib/formatDuration'
import { plural } from '../../lib/plural'

/** This week at a glance: a dot per day (practised, today, to come), minutes and the streak. */
export function WeekStrip({ sessions, now }: { sessions: Session[]; now: number }) {
  const days = weekDays(sessions, now)
  const streak = streakDays(sessions, now)
  const practised = days.filter((day) => day.practised).length
  const minutes = practiceTimeSince(sessions, weekStart(now), now)
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="eyebrow">This week</div>
        <ul aria-label="Days practised this week" className="mt-2 flex gap-1.5">
          {days.map((day) => (
            <li
              key={day.at}
              aria-label={`${day.label}, ${day.practised ? 'practised' : day.today ? 'today' : day.future ? 'to come' : 'rest'}`}
              className={cn(
                'size-[22px] rounded-full',
                day.practised
                  ? 'bg-orange'
                  : day.today
                    ? 'border-2 border-yellow'
                    : 'border-[1.5px] border-line',
              )}
            />
          ))}
        </ul>
      </div>
      <div className="text-right">
        <div className="text-[26px] font-semibold leading-[1.1] tabular-nums">
          {formatMinutes(minutes)}
        </div>
        <div className="text-[13px] text-muted">
          {plural(practised, 'day')}
          {streak > 0 && ` · ${streak}-day streak`}
        </div>
      </div>
    </div>
  )
}
