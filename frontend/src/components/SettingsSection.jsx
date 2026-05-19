import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, SectionHeader, Btn } from './ui.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
 
export default function SettingsSection({ user, onLogout }) {
  const { darkMode, setDarkMode, units, setUnits } = useTheme()
  const [saved, setSaved] = useState(false)
 
  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
 
  return (
    <div>
      <SectionHeader
        num="⚙"
        title="Configuración"
        subtitle="Personaliza tu experiencia en FluoroScan Pro"
      />
 
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
 
        {/* ── Cuenta ─────────────────────────────────────── */}
        <Card style={{ padding: '20px 24px' }}>
          <h3 style={titleStyle}>Cuenta</h3>
          <div style={{ display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginTop: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>
                {user?.name}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 2 }}>
                Desde {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('es-ES')
                  : '—'}
              </p>
            </div>
            <Btn variant="secondary" onClick={onLogout}>
              Cerrar sesión
            </Btn>
          </div>
        </Card>
 
        {/* ── Apariencia ─────────────────────────────────── */}
        <Card style={{ padding: '20px 24px' }}>
          <h3 style={titleStyle}>Apariencia</h3>
          <div style={{ marginTop: 14, display: 'flex',
                        flexDirection: 'column', gap: 14 }}>
            <SettingRow
              label="Modo oscuro"
              description="Cambia la paleta a tonos vino/rosa profundos"
            >
              <Toggle value={darkMode} onChange={setDarkMode} />
            </SettingRow>
          </div>
        </Card>
 
        {/* ── Unidades ───────────────────────────────────── */}
        <Card style={{ padding: '20px 24px' }}>
          <h3 style={titleStyle}>Unidades y datos</h3>
          <div style={{ marginTop: 14, display: 'flex',
                        flexDirection: 'column', gap: 14 }}>
            <SettingRow
              label="Unidad de concentración"
              description="Se refleja en tabla, gráficas y resultados"
            >
              <select value={units} onChange={e => setUnits(e.target.value)}
                      style={selectStyle}>
                <option value="mg/mL">mg/mL</option>
                <option value="µg/mL">µg/mL</option>
                <option value="mM">mM</option>
                <option value="µM">µM</option>
                <option value="nM">nM</option>
                <option value="%">%</option>
              </select>
            </SettingRow>
 
            <SettingRow label="Decimales en resultados" description="">
              <select style={selectStyle} defaultValue="4">
                <option value="2">2 decimales</option>
                <option value="4">4 decimales</option>
                <option value="6">6 decimales</option>
              </select>
            </SettingRow>
          </div>
        </Card>
 
        {/* ── Acerca de ──────────────────────────────────── */}
        <Card style={{ padding: '20px 24px' }}>
          <h3 style={titleStyle}>Acerca de</h3>
          <div style={{ marginTop: 10, display: 'flex',
                        flexDirection: 'column', gap: 6 }}>
            {[
              ['Versión',     'FluoroScan Pro v3.1'],
              ['Stack',       'React 18 + FastAPI'],
              ['Modelo',      'I(x) = a·x·e^(-bx) + c'],
              ['Institución', 'CIBIO · Biomédica 2025'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                <span style={{ color: 'var(--text-hint)', width: 100,
                               flexShrink: 0 }}>{k}</span>
                <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
 
      </div>
    </div>
  )
}
 
/* ── Sub-componentes ─────────────────────────────────────── */
function SettingRow({ label, description, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 16 }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-body)' }}>
          {label}
        </p>
        {description && (
          <p style={{ fontSize: 10, color: 'var(--text-hint)', marginTop: 2 }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}
 
function Toggle({ value, onChange }) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      animate={{ background: value ? 'var(--rose-500)' : 'var(--border-mid)' }}
      transition={{ duration: .2 }}
      style={{
        width: 44, height: 24, borderRadius: 99,
        border: 'none', cursor: 'pointer',
        position: 'relative', flexShrink: 0,
      }}
    >
      <motion.span
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          position: 'absolute', top: 2,
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,.2)',
          display: 'block',
        }}
      />
    </motion.button>
  )
}
 
const titleStyle = {
  fontFamily: "'Playfair Display', serif",
  fontSize: 14, fontWeight: 600,
  color: 'var(--text-heading)',
}
 
const selectStyle = {
  background: 'var(--bg-tint)',
  border: '1.5px solid var(--border-soft)',
  borderRadius: 8, padding: '7px 12px',
  fontSize: 12, color: 'var(--text-body)',
  cursor: 'pointer', outline: 'none',
}