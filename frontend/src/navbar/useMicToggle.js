import { useEffect } from 'react'
import { audioManager } from '../utilities/Audio'

export function useMicToggle({ enabled, socketRef, ensureAudioContext }) {
  useEffect(() => {
    ensureAudioContext()
    const ws = socketRef.current

    if (enabled) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        audioManager.turnMicOn(ws).catch(e => console.error('Mic on failed', e))
      }
    } else {
      audioManager.turnMicOff()
    }
    // No cleanup — mic state is explicit via the toggle
  }, [enabled, socketRef, ensureAudioContext])
}