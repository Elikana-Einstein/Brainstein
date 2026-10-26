import { useCallback, useEffect, useRef } from 'react'

const SAMPLE_RATE = 24000

export function useAudioQueue() {
  const queueRef    = useRef([])
  const playingRef  = useRef(false)
  const ctxRef      = useRef(null)

  const ensureContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const playNext = useCallback(async () => {
    if (!queueRef.current.length) {
      playingRef.current = false
      return
    }
    playingRef.current = true

    const b64 = queueRef.current.shift()

    try {
      const ctx = ensureContext()
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const int16 = new Int16Array(bytes.buffer)
      const buffer = ctx.createBuffer(1, int16.length, SAMPLE_RATE)
      const ch = buffer.getChannelData(0)
      for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 32768

      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(ctx.destination)
      src.onended = playNext
      src.start()
    } catch (e) {
      console.error('Audio playback error', e)
      playNext()
    }
  }, [ensureContext])

  /** Push a base64-encoded PCM chunk to the queue. */
  const enqueue = useCallback((b64) => {
    queueRef.current.push(b64)
    if (!playingRef.current) playNext()
  }, [playNext])

  const stop = useCallback(() => {
    queueRef.current = []
    playingRef.current = false
    // don't close the context — reusable
  }, [])

  useEffect(() => () => {
    ctxRef.current?.close().catch(() => {})
  }, [])

  return { enqueue, stop, ensureContext }
}