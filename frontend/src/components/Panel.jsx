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

      <div
        className="fixed right-4 top-1/2 z-50 flex w-[300px] -translate-y-1/2 flex-col overflow-hidden rounded-2xl font-[Syne,sans-serif] shadow-[0_24px_64px_rgba(0,0,0,.65),0_0_0_1px_rgba(255,255,255,.025)]"
        style={{
          height: 'calc(100vh - 40px)',
          background: T.bg,
          border: `1px solid ${T.border}`,
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex shrink-0 items-center justify-between px-3.5 py-3"
          style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] shadow-[0_0_14px_rgba(99,102,241,.3)]"
              style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})` }}
            >
              <Sparkles size={14} color="#fff" />
            </div>
            <div>
              <div
                className="text-[13px] font-bold leading-tight tracking-[-0.2px]"
                style={{ color: T.text }}
              >
                AI Assistant
              </div>
              <div
                className="font-['DM_Mono',monospace] text-[10px] transition-colors duration-300"
                style={{ color: loading ? T.accent2 : T.muted }}
              >
                {loading ? 'thinking…' : 'ready'}
              </div>
            </div>
          </div>

          <button
            onClick={openChat}
            aria-label="Close panel"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
            style={{
              background: T.surface3,
              border: `1px solid ${T.border2}`,
              color: T.muted,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div
          className="flex shrink-0 gap-1 px-2.5 pt-2"
          style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}
          role="tablist"
        >
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(id)}
                className="mb-[-1px] flex flex-1 items-center justify-center gap-1.5 border-0 bg-transparent px-1.5 py-[7px] font-[Syne,sans-serif] text-[11.5px] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
                style={{
                  borderBottom: active
                    ? `2px solid ${T.accent}`
                    : '2px solid transparent',
                  color: active ? T.accent2 : T.muted,
                  fontWeight: active ? 700 : 500,
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