/**
 * Panel.jsx — Tabbed side panel (Chat + Sessions)
 */
import React, { useState } from 'react'
import { Sparkles, X, MessageSquare, Layers } from 'lucide-react'
import useStore from '../zustand/store'
import Chat     from '../pages/Chat.jsx'
import Sessions from '../pages/Canvas.jsx'
import T from '../assets/Theme.js'


const TABS = [
  { id: 'chat',     label: 'Chat',     Icon: MessageSquare },
  { id: 'sessions', label: 'Sessions', Icon: Layers        },
]

const Panel = () => {
  const { chatopen, openChat, loading } = useStore()
  const [activeTab, setActiveTab] = useState('chat')

  if (!chatopen) return null

  return (
    <>
      <style>{`
        @keyframes chatSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .chat-scroll::-webkit-scrollbar { width: 3px; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 4px; }
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

        {/* ── Header ── */}
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
            }}>
              <Sparkles size={14} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: '-0.2px' }}>
                AI Assistant
              </div>
              <div style={{ fontSize: 10, color: loading ? T.accent2 : T.muted, fontFamily: "'DM Mono', monospace", transition: 'color .3s' }}>
                {loading ? 'thinking…' : 'ready'}
              </div>
            </div>
          </div>

          <button
            onClick={openChat}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: T.surface3, border: `1px solid ${T.border2}`,
              color: T.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = T.text }}
            onMouseLeave={e => { e.currentTarget.style.color = T.muted }}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex',
          padding: '8px 10px 0',
          gap: 4,
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  flex: 1,
                  padding: '7px 6px',
                  border: 'none',
                  borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  color: active ? T.accent2 : T.muted,
                  fontSize: 11.5,
                  fontWeight: active ? 700 : 500,
                  fontFamily: "'Syne', sans-serif",
                  transition: 'all .15s',
                  marginBottom: -1,
                }}
              >
                <Icon size={12} />
                {label}
              </button>
            )
          })}
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'chat'     && <Chat />}
        {activeTab === 'sessions' && <Sessions />}

      </div>
    </>
  )
}

export default Panel