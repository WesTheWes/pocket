import { vi } from 'vitest'

/** Just enough of the Web Audio API for the metronome to run in jsdom. */
export class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  currentTime = 0
  state = 'suspended'
  destination = {}
  oscillators = 0
  /** Every gain node made, with the values set on it, in order. The first is the master volume. */
  gains: Array<{ values: number[] }> = []
  resumed = 0
  closed = 0
  constructor() {
    FakeAudioContext.instances.push(this)
  }
  createOscillator() {
    this.oscillators++
    return {
      type: '',
      frequency: { value: 0 },
      connect: (node: unknown) => node,
      start: () => {},
      stop: () => {},
    }
  }
  createGain() {
    const record = { values: [] as number[] }
    this.gains.push(record)
    return {
      gain: {
        setValueAtTime: (value: number) => {
          record.values.push(value)
        },
        exponentialRampToValueAtTime: () => {},
      },
      connect: (node: unknown) => node,
    }
  }
  resume() {
    this.resumed++
    this.state = 'running'
    return Promise.resolve()
  }
  close() {
    this.closed++
    return Promise.resolve()
  }
}

/** Makes `new AudioContext()` return a FakeAudioContext. Undo with `vi.unstubAllGlobals()`. */
export function installFakeAudio() {
  FakeAudioContext.instances = []
  vi.stubGlobal('AudioContext', FakeAudioContext)
  return FakeAudioContext
}
