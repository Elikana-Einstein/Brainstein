import React, { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Video, VideoOff, Undo2, Redo2, MessageSquare, Wifi, WifiOff,FileArchiveIcon, LogOutIcon, LogInIcon } from 'lucide-react'
import useStore from '../zustand/store'
import { audioManager } from '../utilities/Audio'

/* ── Inject fonts once ─────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('nb-fonts')) {
  const l = document.createElement('link')
  l.id = 'nb-fonts'
  l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap'
  document.head.appendChild(l)
}

/* ── Tooltip ───────────────────────────────────────── */
const Tip = ({ label, children }) => {
  const [show, setShow] = useState(false)
  return (
    <div
      style={{ position: 'relative', display: 'flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute', left: 'calc(100% + 10px)', top: '50%',
          transform: 'translateY(-50%)',
          background: '#1a1a28', color: '#c8c8e8',
          fontSize: 11, fontFamily: "'DM Mono', monospace",
          padding: '4px 9px', borderRadius: 6,
          border: '1px solid #2a2a3e',
          whiteSpace: 'nowrap', pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 100,
        }}>
          {label}
        </div>
      )}
    </div>
  )
}

/* ── NavButton ─────────────────────────────────────── */
const NavBtn = ({ onClick, active, danger, glow, disabled, children }) => {
  const [hov, setHov] = useState(false)

  let bg = 'transparent'
  let border = '1px solid #1e1e2e'
  let color = '#4a4a6a'
  let shadow = 'none'

  if (active && danger) {
    bg = 'rgba(239,68,68,0.15)'
    border = '1px solid rgba(239,68,68,0.5)'
    color = '#f87171'
    shadow = '0 0 14px rgba(239,68,68,0.25)'
  } else if (active && glow) {
    bg = 'rgba(99,102,241,0.15)'
    border = '1px solid rgba(99,102,241,0.5)'
    color = '#a5b4fc'
    shadow = '0 0 14px rgba(99,102,241,0.25)'
  } else if (active) {
    bg = 'rgba(52,211,153,0.12)'
    border = '1px solid rgba(52,211,153,0.4)'
    color = '#34d399'
    shadow = '0 0 14px rgba(52,211,153,0.2)'
  } else if (hov && !disabled) {
    bg = '#1a1a28'
    border = '1px solid #2a2a3e'
    color = '#9090b8'
  }

  if (disabled) { color = '#2a2a40'; border = '1px solid #141420' }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 40, height: 40, borderRadius: 10,
        border, background: bg, color,
        boxShadow: shadow,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .18s',
        outline: 'none',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

/* ── Divider ───────────────────────────────────────── */
const Div = () => (
  <div style={{ width: 32, height: 1, background: '#1a1a28', margin: '2px auto', flexShrink: 0 }} />
)

/* ══════════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════════ */
const Navbar = () => {
  const [micOn, setMicOn]   = useState(false)
  const [videoOn, setVideoOn] = useState(false)
  const [geminiReady, setGeminiReady] = useState(false)

  const { openChat,connectWS, triggerRedo, triggerUndo, addChatMessage, fabricCanvasRef, ws, wsReady,saveDetails,loggedInn ,showLogin} = useStore()

  const geminiSocketRef   = useRef(null)
  const canvasIntervalRef = useRef(null)
  const audioQueueRef     = useRef([])
  const isPlayingRef      = useRef(false)
  const audioCtxRef       = useRef(null)

  /* ── Sync with store WebSocket ─────────────────── */
  useEffect(() => {
    connectWS();
    setGeminiReady(wsReady)
    geminiSocketRef.current = wsReady ? ws : null
  }, [ws, wsReady])

  useEffect(() => {
    saveDetails()
    return () => clearInterval(canvasIntervalRef.current)
  }, [])

  /* ── AudioContext ────────────────────────────────── */
  const ensureAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed')
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 })
    if (audioCtxRef.current.state === 'suspended')
      audioCtxRef.current.resume()
  }

  const playNextAudio = async () => {
    if (!audioQueueRef.current.length) { isPlayingRef.current = false; return }
    isPlayingRef.current = true
    const b64 = audioQueueRef.current.shift()
    try {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const ctx   = audioCtxRef.current
      if (!ctx || ctx.state === 'closed') {
        audioQueueRef.current.unshift(b64); isPlayingRef.current = false; return
      }
      const int16  = new Int16Array(bytes.buffer)
      const buffer = ctx.createBuffer(1, int16.length, 24000)
      const ch     = buffer.getChannelData(0)
      for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 32768
      const src = ctx.createBufferSource()
      src.buffer = buffer; src.connect(ctx.destination)
      src.onended = () => playNextAudio()
      src.start()
    } catch (e) { console.error('Audio error', e); playNextAudio() }
  }

  /* ── Canvas stream ───────────────────────────────── */
  const startCanvasStream = () => {
    if (canvasIntervalRef.current) return
    canvasIntervalRef.current = setInterval(() => {
      const ws = geminiSocketRef.current
      const canvas = fabricCanvasRef
      if (!ws || ws.readyState !== WebSocket.OPEN || !canvas) return
      try {
        const imageB64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1]
        ws.send(JSON.stringify({ type: 'image', image: imageB64 }))
      } catch (e) { console.error('Snapshot error', e) }
    }, 3000)
  }
  const stopCanvasStream = () => {
    clearInterval(canvasIntervalRef.current)
    canvasIntervalRef.current = null
  }

  //logout
    const logout = () => {
  const { disconnectWS } = useStore.getState()

  disconnectWS()
  localStorage.clear()

  useStore.setState({
    logged: false,
    id: null,
    name: null,
    slides: [],
    currentCanvasId: null,
    currentSlide: null,
    loggedInn:false
  })
}

const login=()=>{
  useStore.setState({
    showLogin:true
    
  })
    console.log(12)

}

  /* ── Mic / Video toggles ─────────────────────────── */
  const toggleMic = async (on) => {
    ensureAudioContext()
    if (on) {
      const ws = geminiSocketRef.current
      if (ws && ws.readyState === WebSocket.OPEN) await audioManager.turnMicOn(ws)
    } else {
      audioManager.turnMicOff()
    }
  }
  useEffect(() => { toggleMic(micOn) }, [micOn])
  useEffect(() => {
    if (videoOn) { ensureAudioContext(); startCanvasStream() }
    else stopCanvasStream()
  }, [videoOn])

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <div style={{
      position: 'fixed', top: '50%', left: 16,
      transform: 'translateY(-50%)',
      zIndex: 50,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 6,
      background: '#0e0e18',
      border: '1px solid #1a1a2a',
      borderRadius: 16,
      padding: '14px 10px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
      fontFamily: "'Syne', sans-serif",
    }}>

      {/* Brand dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: geminiReady ? '#34d399' : '#374151',
        boxShadow: geminiReady ? '0 0 10px #34d39988' : 'none',
        transition: 'all .4s',
        marginBottom: 4,
        flexShrink: 0,
      }} title={geminiReady ? 'Gemini connected' : 'Gemini disconnected'} />

      {/* ── Mic ── */}
      <Tip label={micOn ? 'Mute mic' : 'Unmute mic'}>
        <NavBtn active={micOn} danger={false} onClick={() => setMicOn(v => !v)}>
          {micOn ? <Mic size={17} /> : <MicOff size={17} />}
        </NavBtn>
      </Tip>

      {/* ── Video / canvas stream ── */}
      <Tip label={videoOn ? 'Stop board stream' : 'Stream board to AI'}>
        <NavBtn active={videoOn} glow onClick={() => setVideoOn(v => !v)}>
          {videoOn ? <Video size={17} /> : <VideoOff size={17} />}
        </NavBtn>
      </Tip>

      <Div />

      {/* ── Chat ── */}
      <Tip label="Open chat">
        <NavBtn onClick={openChat}>
          <MessageSquare size={17} />
        </NavBtn>
      </Tip>

      <Div />

      {/* ── Undo / Redo ── */}
      <Tip label="Undo">
        <NavBtn onClick={triggerUndo}>
          <Undo2 size={17} />
        </NavBtn>
      </Tip>

      <Tip label="Redo">
        <NavBtn onClick={triggerRedo}>
          <Redo2 size={17} />
        </NavBtn>
      </Tip>
        <Tip label="Create new canvas">
        <NavBtn onClick={triggerRedo}>
          <FileArchiveIcon size={17} />
        </NavBtn>
      </Tip>
      
        {loggedInn?
         <Tip label="Log out">
        <NavBtn onClick={logout}>
          <LogOutIcon size={17} />
        </NavBtn>
         </Tip>
        :
         <Tip label="Log in">
        <NavBtn onClick={login}>
          <LogInIcon size={17} />
        </NavBtn>
         </Tip>
        }
     

      {/* ── Connection label ── */}
      <div style={{
        marginTop: 6,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      }}>
        {geminiReady
          ? <Wifi size={12} color="#34d399" />
          : <WifiOff size={12} color="#374151" />
        }
        <span style={{
          fontSize: 9, color: geminiReady ? '#34d399' : '#374151',
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.5px',
          transition: 'color .4s',
        }}>
          {geminiReady ? 'LIVE' : 'OFF'}
        </span>
      </div>

    </div>
  )
}

export default Navbar