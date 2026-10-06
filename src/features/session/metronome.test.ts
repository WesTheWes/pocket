import { describe, expect, it } from 'vitest'
import { ACCENT_HZ, CLICK_HZ, createMetronome, SUB_HZ, type AudioContextLike } from './metronome'

class FakeParam {
  calls: Array<[string, number, number]> = []
  setValueAtTime(value: number, time: number) {
    this.calls.push(['set', value, time])
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.calls.push(['ramp', value, time])
  }
}

class FakeOscillator {
  type = ''
  frequency = { value: 0 }
  connectedTo: unknown[] = []
  startedAt?: number
  stoppedAt?: number
  connect(destination: unknown) {
    this.connectedTo.push(destination)
    return destination
  }
  start(time: number) {
    this.startedAt = time
  }
  stop(time: number) {
    this.stoppedAt = time
  }
}

class FakeGain {
  gain = new FakeParam()
  connectedTo: unknown[] = []
  connect(destination: unknown) {
    this.connectedTo.push(destination)
    return destination
  }
}

class FakeContext implements AudioContextLike {
  currentTime = 0
  state = 'suspended'
  destination = { name: 'speakers' }
  oscillators: FakeOscillator[] = []
  gains: FakeGain[] = []
  resumed = 0
  closed = 0
  createOscillator() {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }
  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
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

function setup() {
  const context = new FakeContext()
  let created = 0
  let timer: (() => void) | null = null
  const metronome = createMetronome({
    createContext: () => {
      created++
      return context
    },
    setTimer: (callback) => {
      timer = callback
      return 1
    },
    clearTimer: () => {
      timer = null
    },
  })
  return {
    metronome,
    context,
    get created() {
      return created
    },
    wake() {
      const callback = timer
      timer = null
      callback?.()
    },
    get armed() {
      return timer !== null
    },
  }
}

describe('createMetronome', () => {
  it('does not touch audio until it is started', () => {
    const t = setup()
    expect(t.created).toBe(0)
    expect(t.metronome.isRunning()).toBe(false)
  })

  it('starts by creating the context, resuming it, and clicking on the downbeat', () => {
    const t = setup()
    expect(t.metronome.start(120)).toBe(true)
    expect(t.created).toBe(1)
    expect(t.context.resumed).toBe(1)
    expect(t.metronome.isRunning()).toBe(true)

    const [click] = t.context.oscillators
    expect(click.frequency.value).toBe(ACCENT_HZ)
    expect(click.startedAt).toBeCloseTo(0.05, 9)
    expect(click.stoppedAt).toBeGreaterThan(click.startedAt!)
  })

  it('routes each click through a gain envelope to the speakers', () => {
    const t = setup()
    t.metronome.start(120)
    const [click] = t.context.oscillators
    expect(click.connectedTo).toHaveLength(1)
  })

  it('sends every click through one master volume, squared, set before or while playing', () => {
    const t = setup()
    t.metronome.setVolume(0.5)
    t.metronome.start(120)
    const [master, clickGain] = t.context.gains
    expect(master.connectedTo).toEqual([t.context.destination])
    expect(master.gain.calls).toEqual([['set', 0.25, 0]])
    expect(clickGain.connectedTo).toEqual([master])
    t.context.currentTime = 2
    t.metronome.setVolume(1)
    expect(master.gain.calls[1]).toEqual(['set', 1, 2])
    t.metronome.setVolume(0)
    expect(master.gain.calls[2]).toEqual(['set', 0, 2])
  })

  it('uses a lower pitch for the other beats of the bar', () => {
    const t = setup()
    t.metronome.start(240)
    // Beats fall every 0.25 s from 0.05 s, so run past the fifth one at 1.05 s.
    for (let i = 1; i <= 50; i++) {
      t.context.currentTime = i * 0.025
      t.wake()
    }
    const pitches = t.context.oscillators.map((o) => o.frequency.value)
    expect(pitches.slice(0, 5)).toEqual([ACCENT_HZ, CLICK_HZ, CLICK_HZ, CLICK_HZ, ACCENT_HZ])
  })

  it('plays softer, lower clicks between beats, keeping a subdivision chosen before start', () => {
    const t = setup()
    t.metronome.setSubdivision('eighth')
    t.metronome.start(240)
    for (let i = 1; i <= 50; i++) {
      t.context.currentTime = i * 0.025
      t.wake()
    }
    const pitches = t.context.oscillators.map((o) => o.frequency.value)
    expect(pitches.slice(0, 4)).toEqual([ACCENT_HZ, SUB_HZ, CLICK_HZ, SUB_HZ])
  })

  it('reuses one context across stops and starts', () => {
    const t = setup()
    t.metronome.start(120)
    t.metronome.stop()
    expect(t.metronome.isRunning()).toBe(false)
    expect(t.armed).toBe(false)
    t.metronome.start(120)
    expect(t.created).toBe(1)
    expect(t.metronome.isRunning()).toBe(true)
  })

  it('does not resume a context that is already running', () => {
    const t = setup()
    t.metronome.start(120)
    t.metronome.stop()
    t.metronome.start(120)
    expect(t.context.resumed).toBe(1)
  })

  it('reports the current beat from the audio clock', () => {
    const t = setup()
    t.metronome.start(120)
    for (let i = 1; i <= 24; i++) {
      t.context.currentTime = i * 0.025
      t.wake()
    }
    // Clicks at 0.05, 0.55 ... and the clock is at 0.6.
    expect(t.metronome.beatAt()).toBe(1)
  })

  it('reports no beat when stopped', () => {
    const t = setup()
    expect(t.metronome.beatAt()).toBeNull()
    t.metronome.start(120)
    t.metronome.stop()
    expect(t.metronome.beatAt()).toBeNull()
  })

  it('reports that audio is unavailable instead of throwing', () => {
    const metronome = createMetronome({ createContext: () => null })
    expect(metronome.start(120)).toBe(false)
    expect(metronome.isRunning()).toBe(false)
  })

  it('closes the context on dispose and refuses to start again', () => {
    const t = setup()
    t.metronome.start(120)
    t.metronome.dispose()
    expect(t.context.closed).toBe(1)
    expect(t.armed).toBe(false)
    expect(t.metronome.isRunning()).toBe(false)
    expect(t.metronome.start(120)).toBe(false)
  })

  it('can be disposed without ever having been started', () => {
    const t = setup()
    expect(() => t.metronome.dispose()).not.toThrow()
    expect(t.context.closed).toBe(0)
  })
})
