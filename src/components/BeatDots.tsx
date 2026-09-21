import { cn } from '../lib/cn'

/** Four dots that light up in turn with the metronome. Decorative: the click is the signal. */
export function BeatDots({ beat }: { beat: number | null }) {
  return (
    <div aria-hidden="true" className="flex justify-center gap-3.5">
      {[0, 1, 2, 3].map((index) => {
        const active = beat === index
        return (
          <span
            key={index}
            data-active={active}
            className={cn(
              'size-2.5 rounded-full transition-[transform,background-color] duration-75',
              active ? (index === 0 ? 'scale-150 bg-orange' : 'scale-125 bg-cream') : 'bg-line',
            )}
          />
        )
      })}
    </div>
  )
}
