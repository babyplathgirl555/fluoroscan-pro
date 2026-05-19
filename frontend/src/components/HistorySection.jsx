import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposedChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Card, SectionHeader, Btn, Divider, MetricCard } from './ui.jsx'
import { historyService } from '../lib/historyService.js'

const ROSE   = '#E0286F'
const BLUE   = '#3B82F6'
const BLUE_L = '#93C5FD'

// ─────────────────────────────────────────────────────────────
// SmallChip — estaba usada pero nunca definida en el original
// ─────────────────────────────────────────────────────────────
function SmallChip({ label, value, unit, ok }) {
  const hasOk  = ok !== undefined
  const color  = hasOk ? (ok ? '#16A34A' : '#DC2626') : 'var(--text-hint)'
  const bg     = hasOk ? (ok ? '#F0FDF4' : '#FEF2F2') : 'var(--bg-muted, #F9FAFB)'
  const border = hasOk ? (ok ? '#BBF7D0' : '#FECACA') : 'var(--border-soft)'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 3,
      fontSize: 9, padding: '2px 6px', borderRadius: 6,
      background: bg, border: `1px solid ${border}`, color,
      fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ fontWeight: 400, opacity: .7 }}>{label}:</span>
      {value}
      {unit && <span style={{ fontWeight: 400, opacity: .7 }}>{unit}</span>}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// MiniChart — estaba usada pero nunca definida en el original
// ─────────────────────────────────────────────────────────────
function MiniChart({ concentraciones, intensidades, concOpt, color }) {
  if (!Array.isArray(concentraciones) || !Array.isArray(intensidades)) {
    return (
      <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', padding: 16 }}>
        Sin datos para graficar.
      </p>
    )
  }

  const data = concentraciones.map((c, i) => ({
    x: c,
    y: intensidades[i] ?? 0,
  }))

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: 10, color: 'var(--text-hint)', marginBottom: 6 }}>
        Datos experimentales
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['auto', 'auto']}
            tick={{ fontSize: 9 }}
            tickFormatter={v => v.toFixed(2)}
          />
          <YAxis tick={{ fontSize: 9 }} width={36} />
          <Tooltip
            formatter={(v) => v.toFixed(3)}
            labelFormatter={(v) => `C: ${Number(v).toFixed(3)} mg/mL`}
            contentStyle={{ fontSize: 10 }}
          />
          {concOpt != null && (
            <ReferenceLine
              x={concOpt}
              stroke={color}
              strokeDasharray="4 2"
              label={{ value: 'Ópt', position: 'top', fontSize: 9, fill: color }}
            />
          )}
          <Scatter dataKey="y" fill={color} r={3} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// HistorySection — principal
// ─────────────────────────────────────────────────────────────
export default function HistorySection() {
  const [entries,  setEntries]  = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setEntries(historyService.getAll())
  }, [])

  const handleDelete = (id) => {
    historyService.remove(id)
    setEntries(historyService.getAll())
    if (selected?.id === id) setSelected(null)
  }

  const handleClear = () => {
    historyService.clear()
    setEntries([])
    setSelected(null)
  }

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return '—' }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 24 }}>
        <SectionHeader
          num="📋"
          title="Historial de análisis"
          subtitle={`${entries.length} análisis guardados · persiste entre sesiones`}
        />
        {entries.length > 0 && (
          <Btn variant="ghost" onClick={handleClear}
               style={{ fontSize: 11, color: 'var(--rose-600)' }}>
            Limpiar todo
          </Btn>
        )}
      </div>

      {entries.length === 0 ? (
        <Card style={{ padding: '52px 32px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--rose-50)',
            border: '1px solid var(--rose-100)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px', fontSize: 24,
          }}>📋</div>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 15, fontWeight: 600,
            color: 'var(--text-heading)', marginBottom: 6,
          }}>Sin análisis guardados</p>
          <p style={{ fontSize: 12, color: 'var(--text-hint)' }}>
            Cada análisis completado se guarda aquí automáticamente.
          </p>
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: selected ? '1fr 1.5fr' : '1fr',
          gap: 16, alignItems: 'start',
        }}>

          {/* ── Lista ─────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((entry, i) => {
              const r = entry.results ?? entry

              // ── FIX: usar String() para evitar crash si modelo es undefined ──
              const modeloStr = String(r.modelo_seleccionado ?? '').toLowerCase()
              const isBio     = modeloStr.includes('beer')

              const concentracion_optima = r.concentracion_optima
              const intensidad_maxima    = r.intensidad_maxima
              const r_squared            = r.r_squared

              const empirico  = r.comparacion?.empirico  ?? {}
              const biofisico = r.comparacion?.biofisico ?? {}

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * .03 }}
                >
                  <Card
                    onClick={() => setSelected(prev => prev?.id === entry.id ? null : entry)}
                    style={{
                      padding: '14px 18px', cursor: 'pointer',
                      border: selected?.id === entry.id
                        ? `1.5px solid ${isBio ? BLUE : ROSE}`
                        : '1px solid var(--border-soft)',
                      background: selected?.id === entry.id
                        ? (isBio ? '#EFF6FF' : 'var(--rose-50)')
                        : 'var(--bg-surface)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start',
                                  justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 10, color: 'var(--text-hint)', marginBottom: 6 }}>
                          🕐 {formatDate(entry.fecha)}
                        </p>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
                          <SmallChip
                            label="C. óptima"
                            value={concentracion_optima != null ? concentracion_optima.toFixed(3) : '—'}
                            unit="mg/mL"
                          />
                          <SmallChip
                            label="Int. máx"
                            value={intensidad_maxima != null ? intensidad_maxima.toFixed(3) : '—'}
                          />
                          {r_squared != null && (
                            <SmallChip
                              label="R²"
                              value={r_squared.toFixed(3)}
                              ok={r_squared >= 0.8}
                            />
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 9, padding: '2px 7px', borderRadius: 6,
                            background: isBio ? '#DBEAFE' : 'var(--rose-50)',
                            color: isBio ? BLUE : ROSE,
                            border: `1px solid ${isBio ? BLUE_L : 'var(--rose-200)'}`,
                            fontWeight: 600,
                          }}>
                            {isBio ? '🔬 Beer-Lambert' : '📈 Empírico'}
                          </span>

                          <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>
                            {entry.concentraciones?.length ?? 0} puntos
                          </span>

                          {empirico?.r2 != null && biofisico?.r2 != null && (
                            <span style={{ fontSize: 9, color: 'var(--text-hint)' }}>
                              Emp R²={empirico.r2.toFixed(2)} ·{' '}
                              Bio R²={biofisico.r2.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Nombres de imágenes usadas */}
                        {entry.imageNames && entry.imageNames.length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-soft)' }}>
                            <p style={{ fontSize: 9, color: 'var(--text-hint)', marginBottom: 4 }}>
                              📸 Imágenes ({entry.imageNames.length}):
                            </p>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {entry.imageNames.map((name, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: 8,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: 'var(--bg-deep)',
                                    color: 'var(--text-muted)',
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={name}
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(entry.id) }}
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'var(--rose-50)',
                          border: '1px solid var(--rose-200)',
                          cursor: 'pointer', color: 'var(--rose-500)',
                          fontSize: 10, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                      >✕</button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* ── Detalle ──────────────────────────────────── */}
          <AnimatePresence>
            {selected && (() => {
              const sr      = selected.results ?? selected
              const modelo  = String(sr.modelo_seleccionado ?? '').toLowerCase()
              const isBio   = modelo.includes('beer')
              const sel_r2  = sr.r_squared

              return (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                >
                  <Card style={{ padding: '20px' }}>
                    <MetricCard
                      label="R²"
                      value={sel_r2 != null ? sel_r2.toFixed(4) : '—'}
                      accent={sel_r2 != null && sel_r2 >= 0.8}
                    />
                    <MiniChart
                      concentraciones={selected.concentraciones}
                      intensidades={selected.intensidades}
                      concOpt={sr.concentracion_optima}
                      color={isBio ? BLUE : ROSE}
                    />
                  </Card>
                </motion.div>
              )
            })()}
          </AnimatePresence>

        </div>
      )}
    </div>
  )
}