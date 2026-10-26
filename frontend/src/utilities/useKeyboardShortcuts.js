import { useEffect, useMemo } from 'react'

/* ── Platform detection (for DISPLAY only) ─────────── */
const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')

/* ── Build a combo string from a keydown event ─────── */
export function comboFromEvent(e) {
  const parts = []

  // Accept BOTH Ctrl and Meta as "mod" so it works everywhere
  if (e.ctrlKey || e.metaKey) parts.push('mod')
  if (e.altKey)               parts.push('alt')
  if (e.shiftKey)             parts.push('shift')

  const map = {
    ' ':         'space',
    'escape':    'esc',
    'arrowup':   'up',
    'arrowdown': 'down',
    'arrowleft': 'left',
    'arrowright':'right',
  }
  const key = map[e.key.toLowerCase()] ?? e.key.toLowerCase()
  parts.push(key)

  return parts.join('+')
}

/* ── Format a combo for display ────────────────────── */
export function formatCombo(combo) {
  return combo
    .split('+')
    .map(p => {
      if (p === 'mod')   return isMac ? '⌘' : 'Ctrl'
      if (p === 'shift') return isMac ? '⇧' : 'Shift'
      if (p === 'alt')   return isMac ? '⌥' : 'Alt'
      if (p === 'esc')   return 'Esc'
      if (p === 'up')    return '↑'
      if (p === 'down')  return '↓'
      if (p === 'left')  return '←'
      if (p === 'right') return '→'
      if (p === 'space') return 'Space'
      return p.length === 1 ? p.toUpperCase() : p
    })
    .join(isMac ? '' : '+')
}

/* ── Skip when the user is typing in a field ───────── */
function isTypingTarget(t) {
  if (!t) return false
  return (
    t.isContentEditable ||
    t.tagName === 'INPUT' ||
    t.tagName === 'TEXTAREA' ||
    t.tagName === 'SELECT'
  )
}

/* ── Hook ──────────────────────────────────────────── */
/**
 * @param {Array<{combo: string, action: Function, enabled?: boolean}>} shortcuts
 */
export function useKeyboardShortcuts(shortcuts) {
  const lookup = useMemo(() => {
    const m = {}
    for (const s of shortcuts) {
      if (s.enabled !== false) m[s.combo] = s.action
    }
    return m
  }, [shortcuts])

  useEffect(() => {
    const handler = (e) => {
      // ignore while typing in inputs / contentEditable
      if (isTypingTarget(e.target)) return

      const combo = comboFromEvent(e)
      const fn = lookup[combo]
      if (!fn) return

      e.preventDefault()
      e.stopPropagation()
      fn(e)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lookup])
}