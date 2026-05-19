import React, { useState, useCallback } from 'react'
import {
  ComposedChart, Line, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { analyzeData } from '../lib/api.js'
import { historyService } from '../lib/historyService.js'

const ROSE = '#E0286F'
const BLUE = '#3B82F6'

const fmt4 = (v) => (v != null && !isNaN(v) ? Number(v).toFixed(4) : '—')
const fmt2 = (v) => (v != null && !isNaN(v) ? Number(v).toFixed(2) : '—')
const fmtP = (v) => (v != null && !isNaN(v) ? Number(v).toFixed(4) : '?')

// ── Ecuaciones en texto ──────────────────────────────────────────────────────
// Genera la cadena legible de la ecuación con parámetros sustituidos
function buildEqEmpirico(params) {
  if (!params?.length) return 'I(c) = a·c² + b·c + d'
  const [a, b, d] = params
  const aS = fmtP(a)
  const bS = Math.abs(b) < 1e-12 ? '0' : fmtP(b)
  const dS = Math.abs(d) < 1e-12 ? '0' : fmtP(d)
  const bSign = Number(b) >= 0 ? '+' : '−'
  const dSign = Number(d) >= 0 ? '+' : '−'
  return `I(c) = ${aS}·c² ${bSign} ${Math.abs(b).toFixed(4)}·c ${dSign} ${Math.abs(d).toFixed(4)}`
}

function buildEqBeer(params) {
  if (!params?.length) return 'I(c) = I_max·(1 − e^(−k·c))·e^(−q·c)'
  const [Imax, k, q] = params
  return `I(c) = ${fmtP(Imax)}·(1 − e^(−${fmtP(k)}·c))·e^(−${fmtP(q)}·c)`
}

// ── EquationBadge ─────────────────────────────────────────────────────────────
// Tarjeta elegante que muestra la ecuación con sus parámetros numéricos
function EquationBadge({ isBeer, params, color, compact = false }) {
  const eq = isBeer ? buildEqBeer(params) : buildEqEmpirico(params)

  // Partimos la ecuación en partes para colorear los números
  const parts = eq.split(/(\d+\.\d+)/)

  return (
    <div style={{
      padding: compact ? '8px 12px' : '12px 16px',
      borderRadius: 10,
      background: isBeer ? '#eff6ff' : '#fff1f5',
      border: `1px solid ${isBeer ? '#bfdbfe' : '#fecdd3'}`,
      display: 'inline-block',
      maxWidth: '100%',
    }}>
      {!compact && (
        <p style={{
          fontSize: 10, fontWeight: 700, color, letterSpacing: '.5px',
          textTransform: 'uppercase', marginBottom: 4,
        }}>
            {isBeer ? 'Beer-Lambert + Quenching' : 'Modelo Empírico'}
        </p>
      )}
      <p style={{
        fontFamily: "'Courier New', monospace",
        fontSize: compact ? 10 : 12,
        color: isBeer ? '#1e3a5f' : '#7f1d1d',
        margin: 0,
        wordBreak: 'break-all',
        lineHeight: 1.7,
      }}>
          {parts.map((part, i) => 
            /^\d+\.\d+$/.test(part) 
              ? <span key={i} style={{ fontWeight: 700, color }}>{part}</span> 
              : <span key={i}>{part}</span> 
          )}
      </p>
    </div>
  )
}

// ── CustomTooltip — muestra valor de curva + ecuación compacta ────────────────
function CustomTooltip({ active, payload, label, isBeer, params, color }) {
  if (!active || !payload?.length) return null

  const fitEntry = payload.find(p => p.dataKey === 'fit')
  const expEntry = payload.find(p => p.dataKey === 'exp')

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${color}22`,
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 4px 20px #0000001a',
      fontSize: 11,
      minWidth: 200,
    }}>
      <p style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>
        c = {Number(label).toFixed(3)} mg/mL
      </p>
      {fitEntry?.value != null && (
        <p style={{ color, marginBottom: 2 }}>
          <span style={{ fontWeight: 600 }}>Curva ajustada:</span>{' '}
          {Number(fitEntry.value).toFixed(4)}
        </p>
      )}
      {expEntry?.value != null && (
        <p style={{ color: '#6b7280', marginBottom: 6 }}>
          <span style={{ fontWeight: 600 }}>Experimental:</span>{' '}
          {Number(expEntry.value).toFixed(4)}
        </p>
      )}
      {/* Ecuación compacta dentro del tooltip */}
      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 6, marginTop: 2 }}>
        <EquationBadge isBeer={isBeer} params={params} color={color} compact />
      </div>
    </div>
  )
}

// ── StatRow ────────────────────────────────────────────────────────────────
function StatRow({ label, value, unit, highlight }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', padding: '5px 0',
      borderBottom: '1px solid var(--border-soft, #fce7f3)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-hint, #9ca3af)' }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 700,
        color: highlight ? '#16a34a' : 'var(--text-heading, #1f2937)',
      }}>
        {value}
        {unit && <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  )
}

// ── ModelCard — ahora incluye la ecuación del modelo ──────────────────────────
function ModelCard({ title, r2, rmse, aic, active, color, isBeer, params }) {
  return (
    <div style={{
      flex: 1, padding: '16px 18px', borderRadius: 14,
      border: `${active ? 2 : 1}px solid ${active ? color : 'var(--border-soft, #e5e7eb)'}`,
      background: active
        ? (color === ROSE ? '#fff1f5' : '#eff6ff')
        : 'var(--bg-surface, #fff)',
      transition: 'all .2s',
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, marginBottom: 10,
        color: active ? color : 'var(--text-hint, #6b7280)',
        textTransform: 'uppercase', letterSpacing: '.5px',
      }}>
        {title}
        {active && (
          <span style={{
            marginLeft: 6, fontSize: 9, padding: '2px 6px', borderRadius: 8,
            background: color, color: '#fff', fontWeight: 600,
          }}>
            GANADOR
          </span>
        )}
      </p>
      <StatRow label="R²"   value={fmt4(r2)}   highlight={active} />
      <StatRow label="RMSE" value={fmt4(rmse)} />
      <StatRow label="AIC"  value={fmt2(aic)}  />

      {/* ── Ecuación del modelo ── */}
      {params?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 10, color: 'var(--text-hint)', marginBottom: 4 }}>
            Ecuación ajustada:
          </p>
          <EquationBadge isBeer={isBeer} params={params} color={color} compact />
        </div>
      )}
    </div>
  )
}

// ── EqPanel — panel dedicado que muestra ambas ecuaciones lado a lado ─────────
function EqPanel({ empParams, bioParams, isBeer }) {
  return (
    <div style={{
      padding: '16px 18px', borderRadius: 14,
      background: 'var(--bg-surface, #fff)',
      border: '1px solid var(--border-soft, #e5e7eb)',
      boxShadow: '0 1px 8px #0000000d',
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-hint)',
        textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12,
      }}>
          Ecuaciones de los modelos
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Empírico */}
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: isBeer ? '#fafafa' : '#fff1f5',
          border: `${isBeer ? 1 : 2}px solid ${isBeer ? '#e5e7eb' : ROSE}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: isBeer ? '#e5e7eb' : ROSE,
              color: isBeer ? '#6b7280' : '#fff',
            }}>
                {isBeer ? 'ALTERNATIVO' : 'SELECCIONADO'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
              Modelo Empírico (polinomial)
            </span>
          </div>
          <p style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 12, color: '#7f1d1d',
            background: '#fff', padding: '8px 12px', borderRadius: 7,
            border: '1px solid #fce7f3', margin: 0, wordBreak: 'break-all',
          }}>
            {buildEqEmpirico(empParams).split(/(\d+\.\d+)/).map((part, i) =>
              /^\d+\.\d+$/.test(part)
                ? <span key={i} style={{ fontWeight: 700, color: ROSE }}>{part}</span>
                : <span key={i}>{part}</span>
            )}
          </p>
          <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 5, marginBottom: 0 }}>
            I(c) = a·c² + b·c + d &nbsp;·&nbsp; Escala normalizada [0,1]
          </p>
        </div>

        {/* Beer-Lambert */}
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: isBeer ? '#eff6ff' : '#fafafa',
          border: `${isBeer ? 2 : 1}px solid ${isBeer ? BLUE : '#e5e7eb'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: isBeer ? BLUE : '#e5e7eb',
              color: isBeer ? '#fff' : '#6b7280',
            }}>
                {isBeer ? 'SELECCIONADO' : 'ALTERNATIVO'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
              Beer-Lambert + Quenching
            </span>
          </div>
          <p style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 12, color: '#1e3a5f',
            background: '#fff', padding: '8px 12px', borderRadius: 7,
            border: '1px solid #bfdbfe', margin: 0, wordBreak: 'break-all',
          }}>
            {buildEqBeer(bioParams).split(/(\d+\.\d+)/).map((part, i) =>
              /^\d+\.\d+$/.test(part)
                ? <span key={i} style={{ fontWeight: 700, color: BLUE }}>{part}</span>
                : <span key={i}>{part}</span>
            )}
          </p>
          <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 5, marginBottom: 0 }}>
            I(c) = I_max·(1 − e^(−k·c))·e^(−q·c) &nbsp;·&nbsp; Escala normalizada [0,1]
          </p>
        </div>
      </div>
    </div>
  )
}

// ── ResultChart — curva visible + leyendas sin solaparse + copt clampeado ────
function ResultChart({ concentraciones, intensidades, curva, concOpt, color, isBeer, params }) {
  if (!concentraciones?.length) return null

  const cMin = Math.min(...concentraciones)
  const cMax = Math.max(...concentraciones)
  const xPad = (cMax - cMin) * 0.05
  const xDomMin = cMin - xPad
  const xDomMax = cMax + xPad

  // ── Curva suave: 200 puntos desnormalizados ──────────────────────────────
  // La curva del backend viene en X normalizado [0,1] e Y normalizado [0,1].
  // Desnormalizamos X → escala real. Y también está normalizado, necesitamos
  // re-escalar a la escala real de intensidades para que la curva sea visible.
  // Backend ya devuelve X e Y en escala real (analisis.py corregido)
  const curvaLine = (curva?.x ?? []).map((xReal, i) => ({
    x: xReal,
    fit: curva.y?.[i] ?? null,
  }))

  // ── Puntos experimentales como segunda serie de línea con dots ──────────
  // Usamos dos <Line> en vez de <Line>+<Scatter> para evitar el bug de
  // Recharts donde Scatter no renderiza sobre datos compartidos en ComposedChart.
  const expPoints = concentraciones.map((c, i) => ({
    x: Number(c),
    exp: Number(intensidades[i] ?? 0),
  })).sort((a, b) => a.x - b.x)

  // Array unificado: unión de todos los X, cada entrada tiene fit y/o exp
  const byX = new Map()
  curvaLine.forEach(p => byX.set(p.x, { x: p.x, fit: p.fit }))
  expPoints.forEach(p => {
    const prev = byX.get(p.x) ?? { x: p.x }
    byX.set(p.x, { ...prev, exp: p.exp })
  })
  const allEntries = Array.from(byX.values()).sort((a, b) => a.x - b.x)

  // C ópt: solo mostrar si está dentro del dominio visible
  const cOptNum = Number(concOpt)
  const showCOpt = concOpt != null && !isNaN(cOptNum)
    && cOptNum >= xDomMin && cOptNum <= xDomMax

  const eqStr = isBeer ? buildEqBeer(params) : buildEqEmpirico(params)

  return (
    <div>
      {/* Ecuación sobre la gráfica */}
      <div style={{
        marginBottom: 10,
        padding: '7px 12px',
        borderRadius: 8,
        background: isBeer ? '#eff6ff' : '#fff1f5',
        border: `1px solid ${isBeer ? '#bfdbfe' : '#fecdd3'}`,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color,
          textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap',
        }}>
           Ecuación:
        </span>
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 10.5,
          color: isBeer ? '#1e3a5f' : '#7f1d1d',
          wordBreak: 'break-all',
        }}>
          {eqStr.split(/(\d+\.\d+)/).map((part, i) =>
            /^\d+\.\d+$/.test(part)
              ? <span key={i} style={{ fontWeight: 700, color }}>{part}</span>
              : <span key={i}>{part}</span>
          )}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={allEntries}
          margin={{ top: 14, right: 24, bottom: 52, left: 14 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="x"
            type="number"
            scale="linear"
            domain={[xDomMin, xDomMax]}
            tick={{ fontSize: 10 }}
            tickFormatter={v => Number(v).toFixed(2)}
            label={{
              value: 'Concentración (mg/mL)',
              position: 'insideBottom',
              offset: -36,        // ← más espacio para no solapar leyenda
              fontSize: 10,
              fill: '#9ca3af',
            }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            width={52}
            domain={['auto', 'auto']}
            label={{
              value: 'Intensidad (u.a.)',
              angle: -90,
              position: 'insideLeft',
              offset: 8,
              fontSize: 10,
              fill: '#9ca3af',
            }}
          />
          <Tooltip
            content={
              <CustomTooltip isBeer={isBeer} params={params} color={color} />
            }
          />
          {/* Leyenda arriba para no competir con el label del eje X */}
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ fontSize: 11, paddingBottom: 6 }}
            formatter={v => v === 'exp' ? 'Experimental' : 'Curva ajustada'}
          />
          {showCOpt && (
            <ReferenceLine
              x={cOptNum}
              stroke={color}
              strokeDasharray="5 3"
              label={{
                value: `C ópt: ${cOptNum.toFixed(2)}`,
                position: 'insideTopRight',
                fontSize: 9,
                fill: color,
              }}
            />
          )}

          {/* Curva suave — sin dots */}
          <Line
            dataKey="fit"
            dot={false}
            activeDot={false}
            stroke={color}
            strokeWidth={2.5}
            connectNulls
            name="fit"
            legendType="line"
          />

          {/* Puntos experimentales — con dots grandes, sin línea entre ellos */}
          <Line
            dataKey="exp"
            dot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 8 }}
            stroke="none"          // ← sin línea, solo puntos
            strokeWidth={0}
            connectNulls={false}
            name="exp"
            legendType="circle"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── ParamTable ─────────────────────────────────────────────────────────────
function ParamTable({ isBeer, params, r2Emp, r2Bio, aicEmp, aicBio }) {
  if (!params?.length) return null

  const rows = isBeer
    ? [
        {
          sym: 'I_max',
          val: fmt4(params[0]),
          unit: 'u.a.',
          desc: 'Intensidad máxima teórica — proporcional al rendimiento cuántico (Φ_f) y la intensidad de excitación (I₀).',
        },
        {
          sym: 'k',
          val: fmt4(params[1]),
          unit: 'mL/mg',
          desc: 'Constante de absorción = ε·l·ln(10). Mide qué tan eficientemente el fluoróforo absorbe luz a baja concentración (régimen lineal Beer-Lambert).',
        },
        {
          sym: 'q',
          val: fmt4(params[2]),
          unit: 'mL/mg',
          desc: 'Constante de quenching — tasa a la que la emisión se suprime por colisiones moleculares y efecto de filtro interno a alta concentración.',
        },
        {
          sym: 'c_opt',
          val: fmt4(params[1] > 0 && params[2] > 0
            ? Math.log(1 + params[1] / params[2]) / params[1]
            : null),
          unit: 'mg/mL',
          desc: 'Concentración óptima analítica: c_opt = ln(1 + k/q) / k. A esta concentración la intensidad es máxima — balance entre absorción y quenching.',
        },
      ]
    : [
        {
          sym: 'a',
          val: fmt4(params[0]),
          unit: '—',
          desc: 'Coeficiente cuadrático — controla la curvatura de la parábola.',
        },
        {
          sym: 'b',
          val: fmt4(params[1]),
          unit: '—',
          desc: 'Coeficiente lineal — pendiente inicial de la curva.',
        },
        {
          sym: 'd',
          val: fmt4(params[2]),
          unit: '—',
          desc: 'Término independiente — línea base de fluorescencia.',
        },
      ]

  const r2Delta  = r2Bio  != null && r2Emp  != null ? (r2Bio  - r2Emp).toFixed(4)  : null
  const aicDelta = aicBio != null && aicEmp != null ? (aicEmp - aicBio).toFixed(2) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {isBeer && r2Delta != null && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: '#eff6ff', border: '1px solid #bfdbfe',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: BLUE, marginBottom: 6 }}>
            🏆 ¿Por qué Beer-Lambert + Quenching es el mejor modelo aquí?
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#1e3a5f', lineHeight: 1.8 }}>
            <li>
              <b>Mayor R²:</b> Beer-Lambert obtuvo R²={fmt4(r2Bio)} vs empírico R²={fmt4(r2Emp)}
              {r2Delta > 0 ? ` (+${r2Delta} mejor)` : ''}.
            </li>
            {aicDelta != null && (
              <li>
                <b>AIC más bajo:</b> Beer-Lambert AIC={fmt2(aicBio)} vs empírico AIC={fmt2(aicEmp)}
                . Un AIC más bajo penaliza menos el modelo — mejor balance entre ajuste y complejidad.
              </li>
            )}
            <li>
              <b>Fundamento físico:</b> el modelo captura exactamente los dos fenómenos que ocurren
              en soluciones de fluoresceína: absorción proporcional a la concentración (Beer-Lambert)
              a concentraciones bajas, y supresión por efecto de filtro interno + quenching colisional
              a concentraciones altas.
            </li>
            <li>
              <b>Interpretabilidad:</b> sus parámetros tienen unidades y significado físico directo
              (ver tabla), a diferencia de los coeficientes polinomiales del modelo empírico.
            </li>
          </ul>
        </div>
      )}

      {/* Parámetros */}
      <div>
        <p style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-hint)',
          textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10,
        }}>
          Parámetros ajustados
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(({ sym, val, unit, desc }) => (
            <div key={sym} style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--bg-surface, #fff)',
              border: '1px solid var(--border-soft, #e5e7eb)',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
                  color: isBeer ? BLUE : ROSE,
                  minWidth: 52,
                }}>
                  {sym}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-heading)' }}>
                  = {val}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>{unit}</span>
              </div>
              <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
import { Btn } from './ui.jsx'

export default function AnalyzeSection({ concentraciones, intensidades, images, onResult, onShowResults }) {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const [saveStatus, setSaveStatus] = useState(null)  // 'saving', 'saved', 'error'

  const concArr = React.useMemo(() => {
    if (Array.isArray(concentraciones) && concentraciones.length > 0) return concentraciones
    if (Array.isArray(images)) {
      const vals = images.map(img => img?.concentracion ?? img?.concentration ?? img?.conc ?? null)
      if (vals.every(v => v != null)) return vals
    }
    return []
  }, [concentraciones, images])

  const intArr = React.useMemo(() => {
    if (Array.isArray(intensidades) && intensidades.length > 0) return intensidades
    if (Array.isArray(images)) {
      const vals = images.map(img => img?.intensidad ?? img?.intensity ?? img?.mean ?? null)
      if (vals.every(v => v != null)) return vals
    }
    return []
  }, [intensidades, images])

  React.useEffect(() => {
    console.log('[AnalyzeSection] props:', { conc: concArr.length, int: intArr.length })
  }, [concArr, intArr])

  const canAnalyze = concArr.length >= 3 && intArr.length >= 3 && concArr.length === intArr.length

  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) return
    setStatus('loading')
    setResult(null)
    setErrMsg('')
    setSaveStatus(null)
    try {
      const data = await analyzeData({ concentraciones: concArr, intensidades: intArr })
      setResult(data)
      setStatus('done')
      
      // Guardar automáticamente en historial
      try {
        const imageNames = Array.isArray(images) ? images.map(img => img.filename) : []
        historyService.add({
          concentraciones: concArr,
          intensidades: intArr,
          results: data,
          imageNames,
        })
        setSaveStatus('saved')
      } catch (e) {
        console.warn('No se pudo guardar en historial:', e)
      }
      
      onResult?.(data)
    } catch (e) {
      setErrMsg(e.message || 'Error desconocido')
      setStatus('error')
    }
  }, [concArr, intArr, canAnalyze, onResult, images])

  const modeloStr   = String(result?.modelo_seleccionado ?? '').toLowerCase()
  const isBeer      = modeloStr.includes('beer')
  const activeColor = isBeer ? BLUE : ROSE
  const emp = result?.comparacion?.empirico  ?? {}
  const bio = result?.comparacion?.biofisico ?? {}
  const activeParams = isBeer ? bio.params : emp.params

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Encabezado + botón ──────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <p style={{ fontSize: 12, color: 'var(--text-hint)', margin: 0 }}>
          {canAnalyze
            ? `${concArr.length} puntos listos · empírico + Beer-Lambert`
            : `Necesitas mínimo 3 imágenes con concentraciones (detectados: conc=${concArr.length}, int=${intArr.length})`}
        </p>
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze || status === 'loading'}
          style={{
            padding: '10px 28px', borderRadius: 50, border: 'none',
            cursor: canAnalyze && status !== 'loading' ? 'pointer' : 'not-allowed',
            fontWeight: 700, fontSize: 13, letterSpacing: '.3px',
            background: canAnalyze && status !== 'loading'
              ? `linear-gradient(135deg, ${ROSE}, #c0185a)` : '#e5e7eb',
            color: canAnalyze && status !== 'loading' ? '#fff' : '#9ca3af',
            boxShadow: canAnalyze && status !== 'loading' ? `0 4px 14px ${ROSE}55` : 'none',
            transition: 'all .2s',
          }}
        >
          {status === 'loading' ? '⏳ Analizando…' : 'Ejecutar análisis'}
        </button>
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {status === 'loading' && (
        <div style={{
          padding: 32, borderRadius: 16, textAlign: 'center',
          background: '#fff1f5', border: '1px solid #fecdd3',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: `3px solid ${ROSE}`, borderTopColor: 'transparent',
            margin: '0 auto 12px', animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontSize: 13, color: ROSE, fontWeight: 600 }}>Ajustando modelos…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────── */}
      {status === 'error' && (
        <div style={{
          padding: '16px 20px', borderRadius: 14,
          background: '#fef2f2', border: '1px solid #fecaca',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>❌</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>
              Error en el análisis
            </p>
            <p style={{ fontSize: 12, color: '#7f1d1d' }}>{errMsg}</p>
            <button onClick={handleAnalyze} style={{
              marginTop: 10, fontSize: 11, padding: '5px 14px',
              borderRadius: 20, border: '1px solid #fca5a5',
              background: '#fff', color: '#dc2626', cursor: 'pointer',
            }}>Reintentar</button>
          </div>
        </div>
      )}

      {/* ── Resultados ──────────────────────────────────────── */}
      {status === 'done' && result && (
        <>
          {/* Métricas top */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Concentración óptima', value: fmt4(result.concentracion_optima), unit: 'mg/mL' },
              { label: 'Intensidad máxima',    value: fmt4(result.intensidad_maxima) },
              { label: 'R² del modelo',        value: fmt4(result.r_squared) },
            ].map(({ label, value, unit }) => (
              <div key={label} style={{
                padding: '14px 16px', borderRadius: 14, textAlign: 'center',
                background: 'var(--bg-surface, #fff)',
                border: '1px solid var(--border-soft, #e5e7eb)',
                boxShadow: '0 1px 6px #0000000a',
              }}>
                <p style={{
                  fontSize: 10, color: 'var(--text-hint)', marginBottom: 6,
                  textTransform: 'uppercase', letterSpacing: '.5px',
                }}>{label}</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-heading, #1f2937)' }}>
                  {value}
                  {unit && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3, color: 'var(--text-hint)' }}>{unit}</span>}
                </p>
              </div>
            ))}
          </div>

          {/* ── Panel de ecuaciones ──────────────────────────── */}
          <EqPanel
            empParams={emp.params}
            bioParams={bio.params}
            isBeer={isBeer}
          />

          {/* ── Gráfica interactiva ──────────────────────────── */}
          <div style={{
            padding: 16, borderRadius: 16,
            background: 'var(--bg-surface, #fff)',
            border: '1px solid var(--border-soft, #e5e7eb)',
            boxShadow: '0 1px 8px #0000000d',
          }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-hint)',
              textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4,
            }}>
              Curva de fluorescencia — interactiva
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-hint)', marginBottom: 12 }}>
              Modelo: {result.modelo_seleccionado} · R²={fmt4(result.r_squared)}
            </p>
            <ResultChart
              concentraciones={concArr}
              intensidades={intArr}
              curva={result.curva}
              concOpt={result.concentracion_optima}
              color={activeColor}
              isBeer={isBeer}
              params={activeParams}
            />
          </div>

          {/* ── Gráfica matplotlib (si existe) ──────────────── */}
          {result.grafica_b64 && (
            <div style={{
              padding: 16, borderRadius: 16,
              background: 'var(--bg-surface, #fff)',
              border: '1px solid var(--border-soft, #e5e7eb)',
              boxShadow: '0 1px 8px #0000000d',
            }}>
              <p style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-hint)',
                textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12,
              }}>
                Gráfica generada por Python (alta resolución)
              </p>
              <img
                src={`data:image/png;base64,${result.grafica_b64}`}
                alt="Curva de fluorescencia generada por Python"
                style={{ width: '100%', borderRadius: 10, border: '1px solid #f3f4f6' }}
              />
            </div>
          )}

          {/* ── Comparación de modelos ───────────────────────── */}
          <div>
            <p style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-hint)',
              textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10,
            }}>
              Comparación de modelos
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <ModelCard
                title="Empírico (polinomial)"
                r2={result.r2_empirico ?? emp.r2}
                rmse={emp.rmse}
                aic={emp.aic}
                active={!isBeer}
                color={ROSE}
                isBeer={false}
                params={emp.params}
              />
              <ModelCard
                title="Beer-Lambert + Quenching"
                r2={result.r2_biofisico ?? bio.r2}
                rmse={bio.rmse}
                aic={bio.aic}
                active={isBeer}
                color={BLUE}
                isBeer={true}
                params={bio.params}
              />
            </div>
          </div>

          {/* ── Interpretación + parámetros ─────────────────── */}
          <ParamTable
            isBeer={isBeer}
            params={activeParams}
            r2Emp={result.r2_empirico ?? emp.r2}
            r2Bio={result.r2_biofisico ?? bio.r2}
            aicEmp={emp.aic}
            aicBio={bio.aic}
          />

          {/* Advertencias */}
          {result.interpretacion?.advertencias?.length > 0 && (
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: '#fef3c7', border: '1px solid #fde68a',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
                Advertencias
              </p>
              {result.interpretacion.advertencias.map((a, i) => (
                <p key={i} style={{ fontSize: 11, color: '#78350f', lineHeight: 1.6 }}>• {a}</p>
              ))}
            </div>
          )}

          {/* Badge modelo elegido + estado de guardado */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
              fontSize: 12, fontWeight: 700, padding: '6px 20px', borderRadius: 50,
              background: isBeer ? '#eff6ff' : '#fff1f5',
              color: activeColor, border: `1.5px solid ${activeColor}`,
            }}>
              Modelo seleccionado: {result.modelo_seleccionado}
            </span>

            {/* Indicador de guardado */}
            {saveStatus === 'saved' && (
                <span style={{
                fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 50,
                background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
              }}>
                Guardado en historial
              </span>
            )}
            {saveStatus === 'error' && (
                <span style={{
                fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 50,
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
              }}>
                Error al guardar
              </span>
            )}

            {/* Botón para mostrar resultados en la vista principal */}
            {onShowResults && (
              <Btn style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => onShowResults()}>
                Ver resultados
              </Btn>
            )}
          </div>
        </>
      )}

      {/* ── Estado inicial ───────────────────────────────────── */}
      {status === 'idle' && (
        <div style={{
          padding: '40px 24px', borderRadius: 16, textAlign: 'center',
          background: '#fff1f5', border: '1px dashed #fda4af',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🧬</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 6 }}>
            {canAnalyze ? 'Listo para analizar' : 'Datos insuficientes'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-hint)' }}>
            {canAnalyze
              ? `${concArr.length} puntos cargados. Presiona "Ejecutar análisis".`
              : 'Completa los pasos anteriores (mínimo 3 imágenes con concentraciones).'}
          </p>
          {!canAnalyze && (concArr.length > 0 || intArr.length > 0) && (
            <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>
              Detectado: {concArr.length} concentraciones, {intArr.length} intensidades.
              {concArr.length !== intArr.length ? ' ⚠ Longitudes distintas.' : ''}
            </p>
          )}
        </div>
      )}

    </div>
  )
}