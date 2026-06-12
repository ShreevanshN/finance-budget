import { useEffect } from 'react'
import { formatINR } from '../constants.js'

// ─── Badge ─────────────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  green:  { bg: '#EAF3DE', text: '#3B6D11' },
  amber:  { bg: '#FAEEDA', text: '#854F0B' },
  red:    { bg: '#FCEBEB', text: '#A32D2D' },
  blue:   { bg: '#E6F1FB', text: '#185FA5' },
  purple: { bg: '#EEEDFE', text: '#3C3489' },
  gray:   { bg: '#F1EFE8', text: '#444441' },
}

export function Badge({ children, color = 'gray' }) {
  const s = BADGE_STYLES[color] || BADGE_STYLES.gray
  return (
    <span style={{
      background: s.bg, color: s.text,
      fontSize: 11, fontWeight: 500,
      padding: '2px 7px', borderRadius: 4,
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

// ─── MetricCard ────────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: accent || 'var(--text1)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── BudgetBar ─────────────────────────────────────────────────────────────────
export function BudgetBar({ label, spent, budget, color }) {
  const ratio = budget ? Math.min(spent / budget, 1) : 0
  const over  = budget && spent > budget
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text2)' }}>{label}</span>
        <span style={{ color: over ? '#A32D2D' : 'var(--text1)', fontWeight: 500 }}>
          {formatINR(spent)} {budget ? `/ ${formatINR(budget)}` : ''}
          {over && ' ⚠'}
        </span>
      </div>
      <div style={{ height: 7, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.round(ratio * 100)}%`, height: '100%',
          background: over ? '#E24B4A' : color,
          borderRadius: 4, transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400)
    return () => clearTimeout(t)
  }, [onDone])

  const bg    = type === 'error' ? '#FCEBEB' : '#EAF3DE'
  const color = type === 'error' ? '#A32D2D' : '#3B6D11'

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: bg, color,
      padding: '10px 18px', borderRadius: 8,
      fontSize: 13, fontWeight: 500,
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      animation: 'slideUp 0.2s ease',
    }}>
      {type === 'error' ? '✕ ' : '✓ '}{message}
    </div>
  )
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────
export function ModalBackdrop({ onClose, children, maxWidth = 620 }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg1)', borderRadius: 12,
        width: '100%', maxWidth,
        maxHeight: '90vh', overflowY: 'auto',
        border: '0.5px solid var(--border)',
      }}>
        {children}
      </div>
    </div>
  )
}

// ─── Shared input style ────────────────────────────────────────────────────────
export const inputStyle = {
  padding: '8px 10px', borderRadius: 6, fontSize: 13,
  border: '0.5px solid var(--border)', background: 'var(--bg2)',
  color: 'var(--text1)', width: '100%',
}
