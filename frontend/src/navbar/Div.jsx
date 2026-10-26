import React from 'react'
import { COLORS } from './styles'

const Div = () => (
  <div
    style={{
      width: 32,
      height: 1,
      background: COLORS.borderDim,
      margin: '2px auto',
      flexShrink: 0,
    }}
  />
)

export default Div