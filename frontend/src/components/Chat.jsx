/**
 * Chat.jsx — Elick AI Chat Panel (dark theme)
 * Matches Whiteboard.jsx + Navbar.jsx aesthetic
 */

import {
  SendHorizontal, Loader2, StopCircle,
  Mic, MicOff, Paperclip, X,
  FileText, ImageIcon, Film, Music, Archive, Sparkles
} from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import useStore from '../zustand/store'
import ChatInterface from '../pages/Ai'

/* ── Inject fonts once ─────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('chat-fonts')) {
  const l = document.createElement('link')
  l.id = 'chat-fonts'
  l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=DM+Mono:wght@400;500&display=swap'
  document.head.appendChild(l)
}

/* ── Theme ─────────────────────────────────────────── */
const T = {
  bg:       '#0e0e18',
  surface:  '#111119',
  surface2: '#16161f',
  surface3: '#1a1a28',
  border:   '#1e1e2e',
  border2:  '#252538',
  accent:   '#6366f1',
  accent2:  '#818cf8',
  red:      '#f87171',
  text:     '#d0d0ec',
  muted:    '#48486a',
  subtext:  '#32324e',
}

/* ── File icon ─────────────────────────────────────── */
const getFileIcon = (file) => {
  if (!file) return <FileText size={12} color={T.accent2} />
  const t = file.type
  if (t.startsWith('image/')) return <ImageIcon size={12} color={T.accent2} />
  if (t.startsWith('video/')) return <Film      size={12} color={T.accent2} />
  if (t.startsWith('audio/')) return <Music     size={12} color={T.accent2} />
  if (t.includes('zip') || t.includes('rar') || t.includes('tar'))
    return <Archive size={12} color={T.accent2} />
  return <FileText size={12} color={T.accent2} />
}

const fmtSize = (b) => {
  if (b < 1024)    return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

/* ── Icon button ───────────────────────────────────── */
const IconBtn = ({
  onClick, onMouseDown, onMouseUp, onTouchStart, onTouchEnd,
  disabled, title, danger, primary, children
}) => {
  const [hov, setHov] = useState(false)

  let bg     = T.surface3
  let border = `1px solid ${T.border2}`
  let color  = T.muted
  let shadow = 'none'

  if (primary) {
    bg     = disabled ? T.surface3 : `linear-gradient(135deg, ${T.accent}, ${T.accent2})`
    border = disabled ? `1px solid ${T.border}` : `1px solid ${T.accent}`
    color  = disabled ? T.muted : '#fff'
    shadow = disabled ? 'none' : `0 0 14px rgba(99,102,241,.35)`
  } else if (danger) {
    bg     = 'rgba(248,113,113,.1)'
    border = '1px solid rgba(248,113,113,.35)'
    color  = T.red
    shadow = '0 0 10px rgba(248,113,113,.15)'
  } else if (hov && !disabled) {
    bg     = '#1c1c2c'
    border = `1px solid ${T.border2}`
    color  = T.text
  }

  return (
    <button
      title={title}
      onClick={disabled ? undefined : onClick}
      onMouseDown={onMouseDown} onMouseUp={onMouseUp}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 8,
        background: bg, border, color, boxShadow: shadow,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .15s', outline: 'none', flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

/* ══════════════════════════════════════════════════
   CHAT
══════════════════════════════════════════════════ */
const Chat = () => {
  const {
    chatopen, openChat,
    inputMessage, setInputMessage,
    addChatMessage, ws,loading,setLoading
  } = useStore()

  const [recording,    setRecording]    = useState(false)
  const [attachedFile, setAttachedFile] = useState(null)
  const [waveHeights,  setWaveHeights]  = useState(Array(14).fill(3))

  const abortRef       = useRef(null)
  const currentTextRef = useRef('')
  const mediaRecRef    = useRef(null)
  const audioChunksRef = useRef([])
  const fileInputRef   = useRef(null)
  const waveRef        = useRef(null)

  /* ── Waveform animation ───────────────────────────── */
  useEffect(() => {
    if (recording) {
      waveRef.current = setInterval(() => {
        setWaveHeights(Array(14).fill(0).map(() => 3 + Math.random() * 18))
      }, 90)
    } else {
      clearInterval(waveRef.current)
      setWaveHeights(Array(14).fill(3))
    }
    return () => clearInterval(waveRef.current)
  }, [recording])

  /* ── Stop ─────────────────────────────────────────── */
  const handleStop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    useStore.setState((s) => {
      const updated = [...s.ChatHistory]
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].ai === '...') { updated.splice(i, 1); break }
      }
      return { ChatHistory: updated }
    })
    setInputMessage(currentTextRef.current)
    currentTextRef.current = ''
  }

  /* ── Send text ────────────────────────────────────── */
  const handleSend = async () => {
    const text = inputMessage.trim()
    if ((!text && !attachedFile) || loading) return
    ws?.send(JSON.stringify({ type:"text",text:text }))
    
    const userMsg = attachedFile
      ? `📎 ${attachedFile.name}${text ? '\n' + text : ''}`
      : text

    currentTextRef.current = text
    addChatMessage({ user: userMsg, ai: '...' })
    setInputMessage('')
    setAttachedFile(null)
    setLoading(true)
    abortRef.current = new AbortController()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  /* ── Voice ────────────────────────────────────────── */

  // blob → base64 helper
  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror  = reject
    reader.readAsDataURL(blob)
  })

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecRef.current = mr

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        stream.getTracks().forEach(t => t.stop())
        await sendVoiceNote(blob)
      }

      mr.start()
      setRecording(true)
      console.log('[Chat] Recording started, mimeType:', mimeType)
    } catch (err) {
      console.error('[Chat] Mic error:', err)
    }
  }

  const stopRecording = () => {
    const mr = mediaRecRef.current
    // check state on the recorder directly — avoids stale closure on recording state
    if (mr && mr.state !== 'inactive') {
      mr.stop()
      setRecording(false)
      console.log('[Chat] Recording stopped')
    }
  }

  const sendVoiceNote = async (blob) => {
    console.log('[Chat] Sending voice note, blob size:', blob.size)

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('[Chat] WebSocket not connected, readyState:', ws?.readyState)
      return
    }

    setLoading(true)
    addChatMessage({ user: '🎙️ Voice message', ai: '...' })

    try {
      const base64Full  = await blobToBase64(blob)
      const audioBase64 = base64Full.split(',')[1]
      console.log('[Chat] Audio base64 length:', audioBase64.length)

      ws.send(JSON.stringify({ type: 'analyse', audioBase64 }))
    } catch (err) {
      console.error('[Chat] Voice send failed:', err)
      useStore.setState((s) => {
        const updated = [...s.ChatHistory]
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].ai === '...') { updated.splice(i, 1); break }
        }
        return { ChatHistory: updated }
      })
      setLoading(false)
    }
    // setLoading(false) is triggered by stream_end in the store
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) setAttachedFile(file)
    e.target.value = ''
  }

  const canSend = (inputMessage.trim() || attachedFile) && !loading && !recording

  if (!chatopen) return null

  /* ── Render ───────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes chatSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .chat-scroll::-webkit-scrollbar { width: 3px; }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: #1e1e2e; border-radius: 4px;
        }
      `}</style>

      <div style={{
        position: 'fixed',
        top: '50%', right: 16,
        transform: 'translateY(-50%)',
        height: 'calc(100vh - 40px)',
        width: 300,
        display: 'flex', flexDirection: 'column',
        background: T.bg,
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.025)',
        overflow: 'hidden',
        zIndex: 50,
        fontFamily: "'Syne', sans-serif",
      }}>

        {/* ── Header ─────────────────────────────────── */}
        <div style={{
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 14px rgba(99,102,241,.3)`,
              flexShrink: 0,
            }}>
              <Sparkles size={14} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: '-0.2px' }}>
                AI Assistant
              </div>
              <div style={{
                fontSize: 10, color: loading ? T.accent2 : T.muted,
                fontFamily: "'DM Mono', monospace",
                transition: 'color .3s',
              }}>
                {loading ? 'thinking…' : 'ready'}
              </div>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={openChat}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: T.surface3,
              border: `1px solid ${T.border2}`,
              color: T.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = '#38384e' }}
            onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border2 }}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Messages ───────────────────────────────── */}
        <div
          className="chat-scroll"
          style={{
            flex: 1, overflowY: 'auto',
            padding: '14px 12px',
            scrollbarWidth: 'thin',
            scrollbarColor: `${T.border} transparent`,
          }}
        >
          <ChatInterface />
        </div>

        {/* ── File preview ───────────────────────────── */}
        {attachedFile && (
          <div style={{
            margin: '0 10px 8px',
            padding: '8px 11px',
            background: T.surface2,
            borderRadius: 10,
            border: `1px solid ${T.border2}`,
            display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0,
          }}>
            {getFileIcon(attachedFile)}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: T.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {attachedFile.name}
              </div>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono', monospace" }}>
                {fmtSize(attachedFile.size)}
              </div>
            </div>
            <button
              onClick={() => setAttachedFile(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 2 }}
            >
              <X size={11} />
            </button>
          </div>
        )}

        {/* ── Waveform (recording) ───────────────────── */}
        {recording && (
          <div style={{
            margin: '0 10px 8px',
            padding: '8px 14px',
            background: 'rgba(248,113,113,.07)',
            borderRadius: 10,
            border: '1px solid rgba(248,113,113,.25)',
            display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: T.red,
              boxShadow: `0 0 8px ${T.red}`,
              flexShrink: 0,
              animation: 'aiDotBounce 1s infinite',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              {waveHeights.map((h, i) => (
                <div key={i} style={{
                  width: 2.5, height: h, borderRadius: 2,
                  background: `linear-gradient(to top, ${T.red}, #fb923c)`,
                  transition: 'height 0.09s ease',
                }} />
              ))}
            </div>
            <span style={{
              fontSize: 10, color: T.red,
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
            }}>
              REC
            </span>
          </div>
        )}

        {/* ── Input box ──────────────────────────────── */}
        <div style={{
          margin: '0 10px 10px',
          background: T.surface2,
          borderRadius: 12,
          border: `1px solid ${T.border2}`,
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={recording ? 'Release to send…' : 'Ask me anything…'}
            disabled={loading || recording}
            rows={2}
            style={{
              width: '100%', padding: '11px 13px',
              resize: 'none', background: 'transparent',
              border: 'none', outline: 'none',
              color: T.text, fontSize: 12.5, lineHeight: 1.6,
              fontFamily: "'Syne', sans-serif",
              boxSizing: 'border-box',
            }}
          />

          {/* Action row */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 10px 10px',
          }}>
            {/* Status hint */}
            <span style={{
              fontSize: 10, color: T.subtext,
              fontFamily: "'DM Mono', monospace",
            }}>
              {loading ? 'thinking…' : recording ? 'release to send' : '↵ to send'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>

              {/* File attach */}
              {!loading && !recording && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file" accept="*/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <IconBtn
                    title="Attach file"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <Paperclip size={13} />
                  </IconBtn>
                </>
              )}

              {/* Stop */}
              {loading && (
                <IconBtn danger title="Stop" onClick={handleStop}>
                  <StopCircle size={13} />
                </IconBtn>
              )}

              {/* Mic */}
              {!loading && (
                <IconBtn
                  title="Hold to record"
                  danger={recording}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                >
                  {recording ? <MicOff size={13} /> : <Mic size={13} />}
                </IconBtn>
              )}

              {/* Send */}
              {!loading && !recording && (
                <IconBtn primary disabled={!canSend} title="Send" onClick={handleSend}>
                  <SendHorizontal size={13} />
                </IconBtn>
              )}

              {/* Spinner */}
              {loading && (
                <div style={{
                  width: 30, height: 30,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loader2
                    size={14}
                    color={T.accent}
                    style={{ animation: 'chatSpin 1s linear infinite' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}

export default Chat