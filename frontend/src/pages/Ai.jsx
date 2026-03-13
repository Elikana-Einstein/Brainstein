/**
 * Ai.jsx — Chat history: renders the conversation between user and AI
 */
import React, { useEffect, useRef } from 'react'
import { Sparkles, User } from 'lucide-react'
import useStore from '../zustand/store'
import T from '../assets/Theme.js'

const Ai = () => {
  const { ChatHistory } = useStore()
  const bottomRef = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ChatHistory])

  if (ChatHistory.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '40px 16px', textAlign: 'center',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 20px rgba(99,102,241,0.25)`,
        }}>
          <Sparkles size={18} color="#fff" />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "'Syne', sans-serif" }}>
          Start the conversation
        </div>
        <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
          Type a message or speak —{'\n'}the AI is listening.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {ChatHistory.map((msg, i) => (
        <Message key={msg.id || i} msg={msg} />
      ))}
      {/* Invisible anchor to scroll to */}
      <div ref={bottomRef} />
    </div>
  )
}

const Message = ({ msg }) => {
  const isUser = msg.role === 'user'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: 8,
    }}>

      {/* Avatar */}
      <div style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        background: isUser
          ? `linear-gradient(135deg, #2d2d4e, #3a3a5e)`
          : `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isUser ? 'none' : `0 0 10px rgba(99,102,241,0.25)`,
        marginTop: 2,
      }}>
        {isUser
          ? <User size={12} color={T.muted} />
          : <Sparkles size={12} color="#fff" />
        }
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          padding: '9px 12px',
          borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          background: isUser ? T.surface3 : T.surface2,
          border: `1px solid ${isUser ? T.border2 : T.border}`,
          fontSize: 12.5,
          lineHeight: 1.65,
          color: msg.text === '...' ? T.muted : T.text,
          fontFamily: "'Syne', sans-serif",
          wordBreak: 'break-word',
          position: 'relative',
        }}>
          {/* Typing indicator */}
          {msg.text === '...' 
            ? <TypingDots /> 
            : (msg.text || msg.transcript || '')}

          {/* Streaming cursor */}
          {!msg.complete && msg.role === 'assistant' && msg.text !== '...' && (
            <span style={{
              display: 'inline-block',
              width: 2, height: 13,
              background: T.accent2,
              borderRadius: 1,
              marginLeft: 2,
              verticalAlign: 'middle',
              animation: 'cursorBlink 1s ease-in-out infinite',
            }} />
          )}
        </div>

        {/* Timestamp */}
        {msg.timestamp && (
          <span style={{
            fontSize: 9.5,
            color: T.subtext,
            fontFamily: "'DM Mono', monospace",
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            paddingLeft: isUser ? 0 : 2,
            paddingRight: isUser ? 2 : 0,
          }}>
            {msg.timestamp}
          </span>
        )}
      </div>
    </div>
  )
}

const TypingDots = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 16 }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{
        width: 5, height: 5, borderRadius: '50%',
        background: T.muted,
        display: 'inline-block',
        animation: `aiDotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
      }} />
    ))}
    <style>{`
      @keyframes aiDotBounce {
        0%, 80%, 100% { transform: translateY(0);   opacity: 0.4; }
        40%            { transform: translateY(-5px); opacity: 1;   }
      }
      @keyframes cursorBlink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
    `}</style>
  </span>
)

export default Ai