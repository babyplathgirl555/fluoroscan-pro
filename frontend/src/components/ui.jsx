import React from 'react'
import { motion } from 'framer-motion'

/* ── Card ────────────────────────────────────────────────── */
export function Card({ children, className = '', tint = false, style = {}, ...p }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .28, ease: [.4, 0, .2, 1] }}
      style={{
        background: tint ? 'var(--bg-tint)' : 'var(--bg-surface)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border-soft)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
      className={className}
      {...p}
    >
      {children}
    </motion.div>
  )
}

/* ── Button ──────────────────────────────────────────────── */
const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  fontWeight: 500, borderRadius: 'var(--r-full)', transition: 'var(--t-fast)',
  whiteSpace: 'nowrap', userSelect: 'none', outline: 'none'
}

const variants = {
  primary: {
    background: 'var(--rose-500)', color: 'var(--text-on-rose)',
    padding: '11px 26px', fontSize: 14,
    boxShadow: '0 2px 12px rgba(224,40,111,.28)',
  },
  secondary: {
    background: 'var(--bg-surface)', color: 'var(--text-body)',
    borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-mid)',
    padding: '10px 22px', fontSize: 13,
  },
  ghost: {
    background: 'transparent', color: 'var(--text-muted)',
    padding: '10px 20px', fontSize: 13,
  },
}

export function Btn({ children, variant = 'primary', style = {}, disabled, ...p }) {
  const [hov, setHov] = React.useState(false)
  const [pre, setPre] = React.useState(false)
  const v = variants[variant]

  const hoverStyle = hov && !disabled
    ? variant === 'primary'
      ? { background: 'var(--rose-600)', transform: 'translateY(-1px)' }
      : { background: 'var(--rose-50)', borderColor: 'var(--rose-300)' }
    : {}

  return (
    <button
      style={{
        ...btnBase, ...v,
        opacity: disabled ? .5 : 1,
        transform: pre ? 'scale(.97)' : hoverStyle.transform || 'none',
        ...hoverStyle,
        ...style,
      }}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPre(false) }}
      onMouseDown={() => setPre(true)}
      onMouseUp={() => setPre(false)}
      {...p}
    >
      {children}
    </button>
  )
}

/* ── Input (CORREGIDO PARA EVITAR WARNINGS) ──────────────── */
export function Input({ style = {}, ...p }) {
  const [foc, setFoc] = React.useState(false)
  
  return (
    <input
      style={{
        background: 'var(--bg-tint)',
        // Separamos las propiedades del borde para evitar el conflicto de React
        borderWidth: '1.5px',
        borderStyle: 'solid',
        borderColor: foc ? 'var(--border-focus)' : 'var(--border-soft)',
        borderRadius: 'var(--r-sm)',
        padding: '9px 14px',
        fontSize: 13,
        color: 'var(--text-body)',
        outline: 'none',
        transition: 'var(--t-fast)',
        width: '100%',
        boxShadow: foc ? '0 0 0 3px rgba(224,40,111,.12)' : 'none',
        ...style,
      }}
      onFocus={() => setFoc(true)}
      onBlur={() => setFoc(false)}
      {...p}
    />
  )
}

/* ── Badge / Pill ────────────────────────────────────────── */
export function Pill({ children, color = 'rose', style = {} }) {
  const map = {
    rose:    { bg: 'var(--rose-50)',   text: 'var(--rose-700)',  border: 'var(--rose-200)' },
    green:   { bg: 'var(--ok-bg)',    text: 'var(--ok-text)',   border: '#A7F3C5' },
    neutral: { bg: 'var(--bg-deep)',  text: 'var(--text-muted)', border: 'var(--border-soft)' },
  }
  const c = map[color] || map.rose
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.text,
      borderWidth: '1px', borderStyle: 'solid', borderColor: c.border,
      borderRadius: 'var(--r-full)',
      padding: '4px 12px', fontSize: 11, fontWeight: 600,
      letterSpacing: '.01em',
      ...style,
    }}>
      {children}
    </span>
  )
}

/* ── Section header ─────────────────────────────────────── */
export function SectionHeader({ num, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {typeof num !== 'undefined' && num !== null && (
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--rose-500)', color: '#fff',
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>{num}</span>
        )}
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 19, fontWeight: 600,
          color: 'var(--text-heading)', letterSpacing: '-.01em',
        }}>{title}</h2>
      </div>
      {subtitle && (
        <p style={{
          marginTop: 5, marginLeft: 40,
          fontSize: 12, color: 'var(--text-hint)',
        }}>{subtitle}</p>
      )}
    </div>
  )
}

/* ── Metric card ────────────────────────────────────────── */
export function MetricCard({ label, value, unit, accent = false }) {
  return (
    <Card tint={accent} style={{ padding: '18px 22px', minWidth: 150 }}>
      <p style={{ fontSize: 11, color: 'var(--text-hint)', marginBottom: 6,
                  textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 24, fontWeight: 700,
          color: accent ? 'var(--rose-500)' : 'var(--text-heading)',
        }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>{unit}</span>}
      </div>
    </Card>
  )
}

/* ── Spinner ────────────────────────────────────────────── */
export function Spinner({ size = 20 }) {
  return (
    <motion.span
      style={{
        display: 'inline-block',
        width: size, height: size,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: 'var(--rose-100)',
        borderTopColor: 'var(--rose-500)',
        borderRadius: '50%',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: .7, repeat: Infinity, ease: 'linear' }}
    />
  )
}

/* ── Divider ────────────────────────────────────────────── */
export function Divider({ style = {} }) {
  return <div style={{ height: 1, background: 'var(--border-soft)', ...style }} />
}

/* ── Status dot ─────────────────────────────────────────── */
export function StatusDot({ ok }) {
  return (
    <motion.span
      animate={{ scale: [1, 1.3, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
      style={{
        width: 7, height: 7, borderRadius: '50%',
        background: ok ? 'var(--ok)' : 'var(--rose-400)',
        display: 'inline-block',
      }}
    />
  )
}