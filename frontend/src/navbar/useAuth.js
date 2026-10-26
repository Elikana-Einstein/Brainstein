import { useCallback } from 'react'
import useStore from '../zustand/store'

export function useAuth() {
  const loggedIn   = useStore(s => s.loggedIn)
  const setShowLogin = useStore(s => s.setShowLogin)

  const login = useCallback(() => setShowLogin(true), [setShowLogin])

  const logout = useCallback(() => {
    const { disconnectWS } = useStore.getState()
    disconnectWS()

    // Only clear OUR keys — not localStorage.clear()
    const keysToClear = ['token', 'user', 'id', 'name']
    keysToClear.forEach(k => localStorage.removeItem(k))

    useStore.setState({
      loggedIn:        false,
      id:              null,
      name:            null,
      slides:          [],
      currentCanvasId: null,
      currentSlide:    null,
    })
  }, [])

  return { loggedIn, login, logout }
}