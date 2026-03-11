import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import useStore from "../zustand/store";

const ChatInterface = () => {
  const { ChatHistory } = useStore();
  const [typingMessage, setTypingMessage] = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const bottomRef = useRef(null);

  /* ── Auto-scroll ──────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ChatHistory, typingMessage]);

  /* ── Typewriter effect on latest AI message ───────── */
  useEffect(() => {
    const last = ChatHistory[ChatHistory.length - 1];
    if (last?.ai && last.ai !== '...') {
      setIsTyping(true);
      let i = 0;
      setTypingMessage('');
      const full = last.ai;
      const iv = setInterval(() => {
        if (i < full.length) { setTypingMessage(full.substring(0, i + 1)); i++; }
        else { clearInterval(iv); setIsTyping(false); }
      }, 8);
      return () => clearInterval(iv);
    }
  }, [ChatHistory]);

  /* ── Empty state ──────────────────────────────────── */
  if (ChatHistory.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #4338ca22, #6366f122)',
          border: '1px solid #2a2a3e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={20} color="#4a4a7a" />
        </div>
        <p style={{
          color: '#3a3a58', fontSize: 12, textAlign: 'center',
          margin: 0, lineHeight: 1.7,
          fontFamily: "'DM Mono', monospace",
        }}>
          Start drawing or<br />ask me anything
        </p>
      </div>
    );
  }

  /* ── Message list ─────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {ChatHistory.map((entry, index) => {
        const isLast = index === ChatHistory.length - 1;

        return (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* ── User bubble ── */}
            {entry.user && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #3730a3, #4f46e5)',
                  color: '#e8e8ff',
                  borderRadius: '14px 14px 3px 14px',
                  padding: '9px 13px',
                  maxWidth: '82%',
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  fontFamily: "'Syne', sans-serif",
                  boxShadow: '0 4px 16px rgba(79,70,229,0.25)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {entry.user}
                </div>
              </div>
            )}

            {/* ── AI bubble ── */}
            {entry.ai && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>

                {/* Avatar */}
                <div style={{
                  width: 24, height: 24, borderRadius: 7,
                  background: 'linear-gradient(135deg, #4338ca, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 2,
                  boxShadow: '0 0 10px rgba(99,102,241,0.3)',
                }}>
                  <Sparkles size={11} color="#fff" />
                </div>

                {/* Bubble */}
                <div style={{
                  background: '#13131f',
                  border: '1px solid #1e1e30',
                  color: '#c8c8e8',
                  borderRadius: '3px 14px 14px 14px',
                  padding: '9px 13px',
                  maxWidth: '82%',
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  fontFamily: "'DM Mono', monospace",
                  wordBreak: 'break-word',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}>
                  {entry.ai === '...' ? (
                    /* Loading dots */
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 18 }}>
                      {[0, 160, 320].map((delay, i) => (
                        <div key={i} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: '#4f46e5',
                          animation: 'aiDotBounce 1s ease-in-out infinite',
                          animationDelay: `${delay}ms`,
                        }} />
                      ))}
                    </div>
                  ) : (
                    <span>
                      {isLast && isTyping ? typingMessage : entry.ai}
                      {/* Blinking cursor while typing */}
                      {isLast && isTyping && (
                        <span style={{
                          display: 'inline-block',
                          width: 2, height: 12,
                          background: '#6366f1',
                          marginLeft: 3,
                          verticalAlign: 'middle',
                          animation: 'aiCursorBlink 0.7s ease-in-out infinite',
                        }} />
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div ref={bottomRef} />

      <style>{`
        @keyframes aiDotBounce {
          0%, 100% { transform: translateY(0);    opacity: 0.3; }
          50%       { transform: translateY(-5px); opacity: 1;   }
        }
        @keyframes aiCursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;