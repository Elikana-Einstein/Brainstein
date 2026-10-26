// components/navbar/Tip.jsx
import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { COLORS, FONTS } from './styles'

const Tip = ({ label, shortcut, children }) => {
  const [show, setShow] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const ref = useRef(null)

  const open = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setCoords({ top: r.top + r.height / 2, left: r.right + 10 })
    setShow(true)
  }

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'flex' }}
      onMouseEnter={open}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <div style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          transform: 'translateY(-50%)',
          background: COLORS.panel,
          color: COLORS.text,
          fontSize: 11,
          fontFamily: FONTS.mono,
          padding: '4px 9px',
          borderRadius: 6,
          border: `1px solid ${COLORS.border}`,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>{label}</span>
          {shortcut && (
            <kbd style={{
              padding: '1px 5px',
              fontSize: 10,
              borderRadius: 4,
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textMid,
              fontFamily: FONTS.mono,
              lineHeight: 1.2,
            }}>
              {shortcut}
            </kbd>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

export default Tip