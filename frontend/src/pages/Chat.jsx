/**
 * Chat.jsx — Chat tab content only
 */
import T from '../assets/Theme.js'

import {

  SendHorizontal, Loader2, StopCircle,
  Paperclip, X, FileText, ImageIcon,
  Film, Music, Archive,
} from 'lucide-react'
import React, { useState, useRef } from 'react'
import useStore from '../zustand/store'
import Ai from './Ai.jsx'

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

const IconBtn = ({ onClick, disabled, title, danger, primary, children }) => {
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
    color  = T.text
  }

  return (
    <button
      title={title}
      onClick={disabled ? undefined : onClick}
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

const Chat = () => {
  const {
    inputMessage, setInputMessage,
    addChatMessage, ws, loading, setLoading,
  } = useStore()

  const [attachedFile, setAttachedFile] = useState(null)
  const fileInputRef   = useRef(null)
  const abortRef       = useRef(null)
  const currentTextRef = useRef('')

  const handleStop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setInputMessage(currentTextRef.current)
    currentTextRef.current = ''
  }

  const handleSend = () => {
    const text = inputMessage.trim()
    if ((!text && !attachedFile) || loading) return
    ws?.send(JSON.stringify({ type: 'text', text }))
    const userMsg = attachedFile
      ? `📎 ${attachedFile.name}${text ? '\n' + text : ''}`
      : text
    currentTextRef.current = text
    // User message
    addChatMessage({ role: 'user', text: userMsg, timestamp: new Date().toLocaleTimeString(), complete: true })
    // Placeholder for AI response
    addChatMessage({ role: 'assistant', text: '...', timestamp: new Date().toLocaleTimeString(), complete: false })
    setInputMessage('')
    setAttachedFile(null)
    setLoading(true)
    abortRef.current = new AbortController()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) setAttachedFile(file)
    e.target.value = ''
  }

  const canSend = (inputMessage.trim() || attachedFile) && !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* ── Messages ── */}
      <div
        className="chat-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', scrollbarWidth: 'thin' }}
      >
        <Ai />
      </div>

      {/* ── File preview ── */}
      {attachedFile && (
        <div style={{
          margin: '0 10px 8px', padding: '8px 11px',
          background: T.surface2, borderRadius: 10,
          border: `1px solid ${T.border2}`,
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          {getFileIcon(attachedFile)}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attachedFile.name}
            </div>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono', monospace" }}>
              {fmtSize(attachedFile.size)}
            </div>
          </div>
          <button onClick={() => setAttachedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 2 }}>
            <X size={11} />
          </button>
        </div>
      )}

      {/* ── Input ── */}
      <div style={{
        margin: '0 10px 10px', background: T.surface2,
        borderRadius: 12, border: `1px solid ${T.border2}`,
        overflow: 'hidden', flexShrink: 0,
      }}>
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything…"
          disabled={loading}
          rows={2}
          style={{
            width: '100%', padding: '11px 13px', resize: 'none',
            background: 'transparent', border: 'none', outline: 'none',
            color: T.text, fontSize: 12.5, lineHeight: 1.6,
            fontFamily: "'Syne', sans-serif", boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px 10px' }}>
          <span style={{ fontSize: 10, color: T.subtext, fontFamily: "'DM Mono', monospace" }}>
            {loading ? 'thinking…' : '↵ to send'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {!loading && (
              <>
                <input ref={fileInputRef} type="file" accept="*/*" style={{ display: 'none' }} onChange={handleFileChange} />
                <IconBtn title="Attach file" onClick={() => fileInputRef.current.click()}>
                  <Paperclip size={13} />
                </IconBtn>
              </>
            )}
            {loading && (
              <IconBtn danger title="Stop" onClick={handleStop}>
                <StopCircle size={13} />
              </IconBtn>
            )}
            {!loading && (
              <IconBtn primary disabled={!canSend} title="Send" onClick={handleSend}>
                <SendHorizontal size={13} />
              </IconBtn>
            )}
            {loading && (
              <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={14} color={T.accent} style={{ animation: 'chatSpin 1s linear infinite' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat