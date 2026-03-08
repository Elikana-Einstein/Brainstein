import { useEffect, useRef, useState } from "react";
import { BrainCircuit } from "lucide-react";
import useStore from "../zustand/store";

const ACCENT = '#4f8ef7'
const ACCENT2 = '#7c6ef7'
const TEXT = '#1e3a5f'
const SUBTEXT = '#5a7fa8'
const USER_BG = `linear-gradient(135deg, #4f8ef7, #7c6ef7)`
const AI_BG = '#eaf2fb'
const AI_BORDER = '#c2d8ee'

const ChatInterface = () => {
  const { ChatHistory } = useStore();
  const [typingMessage, setTypingMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ChatHistory, typingMessage]);

  useEffect(() => {
    const lastEntry = ChatHistory[ChatHistory.length - 1];
    if (lastEntry && lastEntry.ai && lastEntry.ai !== '...') {
      setIsTyping(true);
      let i = 0;
      setTypingMessage('');
      const fullText = lastEntry.ai;
      const interval = setInterval(() => {
        if (i < fullText.length) { setTypingMessage(fullText.substring(0, i + 1)); i++ }
        else { clearInterval(interval); setIsTyping(false) }
      }, 8);
      return () => clearInterval(interval);
    }
  }, [ChatHistory]);

  if (ChatHistory.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, opacity: 0.5 }}>
        <BrainCircuit size={30} color={ACCENT} />
        <p style={{ color: SUBTEXT, fontSize: 12, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
          Start drawing or ask me anything.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ChatHistory.map((entry, index) => {
        const isLast = index === ChatHistory.length - 1;
        return (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* User bubble */}
            {entry.user && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  background: USER_BG,
                  color: 'white', borderRadius: '16px 16px 4px 16px',
                  padding: '9px 13px', maxWidth: '82%',
                  fontSize: 13, lineHeight: 1.5,
                  boxShadow: '0 2px 8px rgba(79,142,247,0.25)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                }}>
                  {entry.user}
                </div>
              </div>
            )}

            {/* AI bubble */}
            {entry.ai && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(79,142,247,0.3)', marginTop: 2
                }}>
                  <BrainCircuit size={12} color="white" />
                </div>
                <div style={{
                  background: AI_BG,
                  border: `1px solid ${AI_BORDER}`,
                  color: TEXT, borderRadius: '4px 16px 16px 16px',
                  padding: '9px 13px', maxWidth: '82%',
                  fontSize: 13, lineHeight: 1.6,
                  wordBreak: 'break-word'
                }}>
                  {entry.ai === '...' ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 18 }}>
                      {[0, 150, 300].map((delay, i) => (
                        <div key={i} style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: ACCENT,
                          animation: 'bounce 0.9s ease-in-out infinite',
                          animationDelay: `${delay}ms`
                        }} />
                      ))}
                    </div>
                  ) : (
                    <span>
                      {isLast && isTyping ? typingMessage : entry.ai}
                      {isLast && isTyping && (
                        <span style={{
                          display: 'inline-block', width: 2, height: 13,
                          background: ACCENT, marginLeft: 3,
                          animation: 'blink 0.7s ease-in-out infinite'
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
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;