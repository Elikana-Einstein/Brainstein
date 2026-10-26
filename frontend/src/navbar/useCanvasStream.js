import { useCallback, useEffect, useRef } from 'react'

const SNAPSHOT_INTERVAL_MS = 3000
const JPEG_QUALITY = 0.6

export function useCanvasStream({ enabled, socketRef, canvasRef }) {
  const intervalRef = useRef(null)

  const start = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      const ws = socketRef.current
      const canvas = canvasRef
      if (!ws || ws.readyState !== WebSocket.OPEN || !canvas) return
      try {
        const image = canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1]
        ws.send(JSON.stringify({ type: 'image', image }))
      } catch (e) {
        console.error('Snapshot error', e)
      }
    }, SNAPSHOT_INTERVAL_MS)
  }, [socketRef, canvasRef])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }, [])

  useEffect(() => {
    enabled ? start() : stop()
    return stop
  }, [enabled, start, stop])
}