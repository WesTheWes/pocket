import { MAX_BPM, MIN_BPM } from '../domain/schemas'
import { BeatDots } from './BeatDots'
import { Icon } from './Icon'

/** The slider covers the useful range; the buttons and typed values go wider. */
const SLIDER_MIN = 40
const SLIDER_MAX = 200

interface Props {
  bpm: number
  onBpmChange: (bpm: number) => void
  playing: boolean
  onToggle: () => void
  /** The beat (0 to 3) sounding now, or null. */
  beat: number | null
  /** False when this browser has no audio. */
  supported: boolean
}

const round =
  'flex shrink-0 items-center justify-center rounded-full border border-line disabled:opacity-40'

/** Beat dots, tempo controls and play. Stacked on phones, one row on desktop. */
export function MetronomePanel({ bpm, onBpmChange, playing, onToggle, beat, supported }: Props) {
  const set = (next: number) => onBpmChange(Math.min(MAX_BPM, Math.max(MIN_BPM, next)))

  return (
    <div className="flex flex-col items-center gap-2 desk:flex-row desk:gap-7 desk:rounded-[24px] desk:bg-surface desk:px-8 desk:py-6">
      <div className="pt-5 desk:hidden">
        <BeatDots beat={beat} />
      </div>

      <div className="flex items-center gap-4 desk:gap-3.5">
        <button
          type="button"
          aria-label="Slower"
          disabled={bpm <= MIN_BPM}
          onClick={() => set(bpm - 1)}
          className={`${round} size-14 bg-surface hover:bg-surface-2 desk:bg-surface-2`}
        >
          <Icon name="minus" size={22} />
        </button>
        <div className="w-[150px] text-center desk:w-[140px]">
          <div className="font-display text-[92px] leading-[0.95] tabular-nums desk:text-[84px]">
            {bpm}
          </div>
          <div className="eyebrow mt-1">BPM</div>
        </div>
        <button
          type="button"
          aria-label="Faster"
          disabled={bpm >= MAX_BPM}
          onClick={() => set(bpm + 1)}
          className={`${round} size-14 bg-surface hover:bg-surface-2 desk:bg-surface-2`}
        >
          <Icon name="plus" size={22} />
        </button>
      </div>

      <div className="flex w-full flex-col gap-3 px-7 desk:flex-1 desk:px-0">
        <div className="hidden desk:block">
          <BeatDots beat={beat} />
        </div>
        <input
          type="range"
          aria-label="Tempo"
          aria-valuetext={`${bpm} BPM`}
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          value={Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, bpm))}
          onChange={(event) => set(Number(event.target.value))}
          className="block h-11 w-full accent-orange"
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label={playing ? 'Stop metronome' : 'Start metronome'}
          aria-pressed={playing}
          onClick={onToggle}
          className="flex size-[72px] items-center justify-center rounded-full bg-orange text-ink hover:brightness-105"
        >
          <Icon name={playing ? 'pause' : 'play'} size={28} />
        </button>
        {!supported && (
          <p role="status" className="text-center text-xs text-muted">
            Sound isn’t available in this browser.
          </p>
        )}
      </div>
    </div>
  )
}
