import React from 'react'
import { motion } from 'framer-motion'
import { StatusDot } from './ui.jsx'

/* ── Íconos — deben definirse ANTES del array NAV ────────── */
function Ico({ d, color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function UploadIcon({ color }) {
  return <Ico color={color} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
}
function TableIcon({ color }) {
  return <Ico color={color} d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />
}
function ChartIcon({ color }) {
  return <Ico color={color} d="M3 3v18h18M18 9l-5 5-4-4-3 3" />
}
function ReportIcon({ color }) {
  return <Ico color={color} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7l5 5v5z" />
}
function HistoryIcon({ color }) {
  return <Ico color={color} d="M12 8v4l3 3M3.05 11a9 9 0 1 0 .5-3M3 4v4h4" />
}
function GearIcon({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

/* ── Nav items — DESPUÉS de los íconos ───────────────────── */
const NAV = [
  { key: 'load',     label: 'Cargar imágenes', icon: UploadIcon  },
  { key: 'table',    label: 'Concentraciones', icon: TableIcon   },
  { key: 'analyze',  label: 'Analizar',         icon: ChartIcon   },
  { key: 'results',  label: 'Resultados',       icon: ReportIcon  },
  { key: 'history',  label: 'Historial',        icon: HistoryIcon },
  { key: 'settings', label: 'Ajustes',          icon: GearIcon    },
]

/* ── Componente principal ────────────────────────────────── */
export default function Sidebar({ active, onNav, apiOk, user, onLogout }) {
  return (
    <aside style={{
      width: 240, flexShrink: 0,
      background: 'var(--sb-bg)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
      overflowY: 'auto',
      transition: 'background .25s ease',
    }}>

      {/* ── Brand ─────────────────────────────────────── */}
      <div style={{ padding: '30px 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--rose-500)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(224,40,111,.4)',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 18 }}>✦</span>
          </div>
          <div>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 15, fontWeight: 700,
              color: 'var(--sb-text)', lineHeight: 1.2,
            }}>FluoroScan</p>
            <p style={{ fontSize: 10, color: 'var(--sb-muted)' }}>Pro v3.1</p>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--sb-muted)',
                    opacity: .25, margin: '0 18px 10px' }} />

      {/* ── Nav ───────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '4px 8px' }}>
        {NAV.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          return (
            <motion.button
              key={key}
              onClick={() => onNav(key)}
              whileHover={{ x: isActive ? 0 : 3 }}
              whileTap={{ scale: .97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                width: '100%', padding: '10px 12px',
                borderRadius: 10, border: 'none',
                background: isActive ? 'var(--sb-active)' : 'transparent',
                cursor: 'pointer', marginBottom: 2,
                textAlign: 'left', position: 'relative',
              }}
            >
              {/* Barra lateral activa */}
              {isActive && (
                <motion.span
                  layoutId="nav-bar"
                  style={{
                    position: 'absolute', left: 0,
                    width: 3, height: 24, borderRadius: 2,
                    background: 'var(--rose-500)',
                  }}
                />
              )}

              <Icon color={isActive ? 'var(--rose-400)' : 'var(--sb-icon)'} />

              <span style={{
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--sb-text)' : 'var(--sb-icon)',
              }}>
                {label}
              </span>

              {isActive && (
                <motion.span
                  layoutId="nav-dot"
                  style={{
                    marginLeft: 'auto', width: 5, height: 5,
                    borderRadius: '50%', background: 'var(--rose-400)',
                  }}
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px 22px',
        borderTop: '1px solid rgba(122,53,85,.2)',
      }}>
        <div style={{
          background: 'var(--sb-active)',
          borderRadius: 12, padding: '12px 14px',
        }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center',
                          gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--rose-700)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: 'var(--sb-text)',
                fontWeight: 700, flexShrink: 0,
              }}>
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: 'var(--sb-text)', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.name}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot ok={apiOk} />
            <span style={{ fontSize: 10, color: 'var(--sb-muted)' }}>
              {apiOk ? 'API conectada' : 'API desconectada'}
            </span>
          </div>
        </div>
      </div>

    </aside>
  )
}