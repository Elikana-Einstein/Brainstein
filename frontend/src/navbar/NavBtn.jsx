import React, { useState } from 'react'
import { COLORS } from './styles'

// variant: undefined | 'danger' | 'glow' | 'success'
const NavBtn = ({ onClick, active, variant, disabled, children }) => {
  const [hov, setHov] = useState(false)

  const style = getBtnStyle({ active, variant, hov, disabled })

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={style}
    >
      {children}
    </button>
  )
}

function getBtnStyle({ active, variant, hov, disabled }) {
  let bg = 'transparent'
  let border = `1px solid ${COLORS.border}`
  let color = COLORS.textDim
  let shadow = 'none'

  if (active && variant === 'danger') {
    bg = COLORS.redBg;    border = `1px solid ${COLORS.redBrd}`
    color = COLORS.red;   shadow = `0 0 14px ${COLORS.redGlow}`
  } else if (active && variant === 'glow') {
    bg = COLORS.indigoBg;    border = `1px solid ${COLORS.indigoBrd}`
    color = COLORS.indigo;   shadow = `0 0 14px ${COLORS.indigoGlow}`
  } else if (active) {
    bg = COLORS.greenBg;    border = `1px solid ${COLORS.greenBrd}`
    color = COLORS.green;   shadow = `0 0 14px ${COLORS.greenGlow}`
  } else if (hov && !disabled) {
    bg = COLORS.panel
    border = `1px solid ${COLORS.border}`
    color = COLORS.textMid
  }

  if (disabled) {
    color = COLORS.textFaint
    border = `1px solid ${COLORS.borderDim}`
  }

  return {
    width: 40,
    height: 40,
    borderRadius: 10,
    border,
    background: bg,
    color,
    boxShadow: shadow,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .18s',
    outline: 'none',
    flexShrink: 0,
  }
}

export default NavBtn