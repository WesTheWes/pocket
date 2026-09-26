import { useCallback, useEffect, useRef, useState } from 'react'
import { createMetronome, type Metronome } from './metronome'
import type { Subdivision } from './scheduler'

/**
 * Owns a metronome for the lifetime of a screen. The metronome is created in an effect, not
 * during render, so React StrictMode's extra mount/unmount cannot leave us holding a disposed
 * one, and it is disposed on unmount so audio never outlives the screen.
 */
export function useMetronome(bpm: number, subdivision: Subdivision = 'quarter') {
  const metronome = useRef<Metronome | null>(null)
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState<number | null>(null)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    const created = createMetronome()
    metronome.current = created
    return () => {
      created.dispose()
      metronome.current = null
    }
  }, [])

  useEffect(() => {
    metronome.current?.setBpm(bpm)
  }, [bpm])

  useEffect(() => {
    metronome.current?.setSubdivision(subdivision)
  }, [subdivision])

  // Follow the audio clock so the beat dots pulse with the click, not with React's timing.
  useEffect(() => {
    if (!playing) return
    let frame = 0
    const follow = () => {
      const current = metronome.current?.beatAt() ?? null
      setBeat((previous) => (previous === current ? previous : current))
      frame = requestAnimationFrame(follow)
    }
    frame = requestAnimationFrame(follow)
    return () => {
      cancelAnimationFrame(frame)
      setBeat(null)
    }
  }, [playing])

  /** Starts or stops. Call it straight from a click handler: browsers only allow audio then. */
  const toggle = useCallback(() => {
    const current = metronome.current
    if (!current) return
    if (current.isRunning()) {
      current.stop()
      setPlaying(false)
      return
    }
    const started = current.start(bpm)
    setSupported(started)
    setPlaying(started)
  }, [bpm])

  return { playing, toggle, beat, supported }
}
