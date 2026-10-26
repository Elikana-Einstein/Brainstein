import React from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { COLORS, FONTS } from './styles'

const ConnectionBadge = ({ online }) => (
  <div
    style={{
      marginTop: 6,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
    }}
  >
    {online
      ? <Wifi size={12} color={COLORS.green} />
      : <WifiOff size={12} color={COLORS.off} />
    }
    <span
      style={{
        fontSize: 9,
        color: online ? COLORS.green : COLORS.off,
        fontFamily: FONTS.mono,
        letterSpacing: '0.5px',
        transition: 'color .4s',
      }}
    >
      {online ? 'LIVE' : 'OFF'}
    </span>
  </div>
)

export default ConnectionBadge