import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Mic, MicOff, Video, VideoOff,
  Undo2, Redo2, MessageSquare,
  FileArchiveIcon, LogOutIcon, LogInIcon,
  Wifi, WifiOff,
  Menu,
} from 'lucide-react'

import useStore from '../zustand/store'

import NavBtn from '../navbar/NavBtn'
import Tip from '../navbar/Tip'
import Div from '../navbar/Div'

import { useAudioQueue } from '../navbar/useAudioQueue'
import { useCanvasStream } from '../navbar/useCanvasStream'
import { useMicToggle } from '../navbar/useMicToggle'
import { useAuth } from '../navbar/useAuth'
import { useKeyboardShortcuts, formatCombo } from '../utilities/useKeyboardShortcuts'

import { COLORS, FONTS } from '../navbar/styles'

/* ── Inject fonts once ─────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('nb-fonts')) {
  const l = document.createElement('link')
  l.id = 'nb-fonts'
  l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap'
  document.head.appendChild(l)
}

/* ── Shortcut map ──────────────────────────────────── */
const SHORTCUTS = {
  mic:       'm',
  video:     'v',
  chat:      'c',
  undo:      'mod+z',
  redo:      'shift+mod+z',
  newCanvas: 'mod+alt+n',
  auth:      'mod+shift+l',
}

/* ══════════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════════ */
const Navbar = () => {
  const [micOn, setMicOn]     = useState(false)
  const [videoOn, setVideoOn] = useState(false)
  const [hovered, setHovered] = useState(false)

  const {
    openChat, triggerRedo, triggerUndo,
    fabricCanvasRef, ws, wsReady,
    setNavClear,
  } = useStore()

  const socketRef = useRef(null)
  const closeTimerRef = useRef(null)

  /* ── Connect once on mount ─────────────────────── */
  useEffect(() => {
    useStore.getState().connectWS()
    useStore.getState().saveDetails()
  }, [])

  /* ── Keep local socketRef in sync ──────────────── */
  useEffect(() => {
    socketRef.current = wsReady ? ws : null
  }, [ws, wsReady])

  /* ── Audio ─────────────────────────────────────── */
  const { enqueue, ensureContext } = useAudioQueue()

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    const onMessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'audio' && msg.audio) enqueue(msg.audio)
      } catch { /* ignore malformed */ }
    }
    socket.addEventListener('message', onMessage)
    return () => socket.removeEventListener('message', onMessage)
  }, [ws, wsReady, enqueue])

  /* ── Toggles ───────────────────────────────────── */
  const toggleMic   = useCallback(() => setMicOn(v => !v), [])
  const toggleVideo = useCallback(() => setVideoOn(v => !v), [])

  useMicToggle({ enabled: micOn, socketRef, ensureAudioContext: ensureContext })
  useCanvasStream({ enabled: videoOn, socketRef, canvasRef: fabricCanvasRef })

  /* ── Auth ──────────────────────────────────────── */
  const { loggedIn, login, logout } = useAuth()
  const toggleAuth = useCallback(
    () => (loggedIn ? logout() : login()),
    [loggedIn, logout, login]
  )

  /* ── Keyboard shortcuts ────────────────────────── */
  const shortcuts = useMemo(() => ([
    { combo: SHORTCUTS.mic,       action: toggleMic },
    { combo: SHORTCUTS.video,     action: toggleVideo },
    { combo: SHORTCUTS.chat,      action: openChat },
    { combo: SHORTCUTS.undo,      action: triggerUndo },
    { combo: SHORTCUTS.redo,      action: triggerRedo },
    { combo: SHORTCUTS.newCanvas, action: setNavClear },
    { combo: SHORTCUTS.auth,      action: toggleAuth },
  ]), [toggleMic, toggleVideo, openChat, triggerUndo, triggerRedo, setNavClear, toggleAuth])

  useKeyboardShortcuts(shortcuts)

  const key = (name) => formatCombo(SHORTCUTS[name])
  const connected = wsReady

  /* ── Open / close with grace delay ─────────────── */
  const open = useCallback(() => {
    clearTimeout(closeTimerRef.current)
    setHovered(true)
  }, [])

  const scheduleClose = useCallback(() => {
    // Only auto-close on devices that actually have hover (mouse/trackpad)
    if (!window.matchMedia('(hover: hover)').matches) return
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setHovered(false), 150)
  }, [])

  const toggle = useCallback(() => {
    setHovered(v => !v)
  }, [])

  /* ── Flash open when a shortcut fires while collapsed ── */
  const flashOpen = useCallback(() => {
    open()
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setHovered(false), 1200)
  }, [open])

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <div
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
      onClick={(e) => {
        // Toggle when clicking the container's own padding (not an inner button)
        if (e.target === e.currentTarget) toggle()
      }}
      style={{
        position: 'fixed',
        top: '50%',
        left: 16,
        transform: 'translateY(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        width: hovered ? 60 : 36,
        padding: hovered ? '14px 10px' : 0,
        boxShadow: hovered
          ? '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)'
          : '0 8px 24px rgba(0,0,0,0.4)',
        fontFamily: FONTS.display,
        overflow: 'hidden',
        cursor: hovered ? 'default' : 'pointer',
        transition:
          'width .3s cubic-bezier(.4,0,.2,1), ' +
          'padding .3s cubic-bezier(.4,0,.2,1), ' +
          'box-shadow .25s ease',
      }}
    >

      {/* ═══════════════════════════════════════════
          COLLAPSED — menu icon + status pip
      ═══════════════════════════════════════════ */}
      <button
        onClick={toggle}
        aria-label="Open menu"
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: COLORS.textMid,
          opacity: hovered ? 0 : 1,
          transform: hovered ? 'scale(0.8)' : 'scale(1)',
          transition: 'opacity .2s ease, transform .2s ease, color .2s',
          pointerEvents: hovered ? 'none' : 'auto',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.green }}
        onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMid }}
      >
        <Menu size={16} />

        {/* tiny connection pip */}
        <span style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: connected ? COLORS.green : COLORS.off,
          boxShadow: connected ? `0 0 6px ${COLORS.green}` : 'none',
          transition: 'background .4s, box-shadow .4s',
        }} />
      </button>

      {/* ═══════════════════════════════════════════
          EXPANDED — status dot + buttons
      ═══════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          maxHeight: hovered ? 700 : 0,
          opacity: hovered ? 1 : 0,
          overflow: 'hidden',
          transition:
            'max-height .3s cubic-bezier(.4,0,.2,1), opacity .2s ease',
        }}
      >

        {/* Status dot */}
        <div
          title={connected ? 'Gemini connected' : 'Gemini disconnected'}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connected ? COLORS.green : COLORS.off,
            boxShadow: connected ? `0 0 10px ${COLORS.green}88` : 'none',
            marginBottom: 6,
            flexShrink: 0,
            transition: 'all .4s',
          }}
        />

        {/* Mic */}
        <Tip label={micOn ? 'Mute mic' : 'Unmute mic'} shortcut={key('mic')}>
          <NavBtn active={micOn} onClick={() => { toggleMic(); flashOpen() }}>
            {micOn ? <Mic size={17} /> : <MicOff size={17} />}
          </NavBtn>
        </Tip>

        {/* Video */}
        <Tip label={videoOn ? 'Stop board stream' : 'Stream board to AI'} shortcut={key('video')}>
          <NavBtn active={videoOn} variant="glow" onClick={() => { toggleVideo(); flashOpen() }}>
            {videoOn ? <Video size={17} /> : <VideoOff size={17} />}
          </NavBtn>
        </Tip>

        <Div />

        {/* Chat */}
        <Tip label="Open chat" shortcut={key('chat')}>
          <NavBtn onClick={openChat}>
            <MessageSquare size={17} />
          </NavBtn>
        </Tip>

        <Div />

        {/* Undo / Redo */}
        <Tip label="Undo" shortcut={key('undo')}>
          <NavBtn onClick={triggerUndo}><Undo2 size={17} /></NavBtn>
        </Tip>

        <Tip label="Redo" shortcut={key('redo')}>
          <NavBtn onClick={triggerRedo}><Redo2 size={17} /></NavBtn>
        </Tip>

        <Tip label="Create new canvas" shortcut={key('newCanvas')}>
          <NavBtn onClick={setNavClear}><FileArchiveIcon size={17} /></NavBtn>
        </Tip>

        {/* Auth */}
        {loggedIn ? (
          <Tip label="Log out" shortcut={key('auth')}>
            <NavBtn onClick={logout}><LogOutIcon size={17} /></NavBtn>
          </Tip>
        ) : (
          <Tip label="Log in" shortcut={key('auth')}>
            <NavBtn onClick={login}><LogInIcon size={17} /></NavBtn>
          </Tip>
        )}

        {/* Connection label */}
        <div style={{
          marginTop: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}>
          {connected
            ? <Wifi size={12} color={COLORS.green} />
            : <WifiOff size={12} color={COLORS.off} />
          }
          <span style={{
            fontSize: 9,
            color: connected ? COLORS.green : COLORS.off,
            fontFamily: FONTS.mono,
            letterSpacing: '0.5px',
            transition: 'color .4s',
          }}>
            {connected ? 'LIVE' : 'OFF'}
          </span>
        </div>

      </div>
    </div>
  )
}

export default Navbar