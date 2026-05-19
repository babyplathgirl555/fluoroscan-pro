import React, { useState } from 'react'
import { Card } from './ui.jsx'

function formatStatValue(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '—'
  }
  return Number(value).toFixed(4)
}

function StatRow({ label, value, unit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
      <span style={{ color: 'var(--text-hint)', fontSize: 13 }}>{label}</span>
      <span style={{ color: 'var(--text-body)', fontSize: 13, fontWeight: 600 }}>{value}{unit ? ` ${unit}` : ''}</span>
    </div>
  )
}

function sectionRows(stats, map) {
  return map.map(([key, label, unit]) => (
    <StatRow
      key={key}
      label={label}
      value={formatStatValue(stats?.[key])}
      unit={unit}
    />
  ))
}

export default function StatsSection({ intensityStats, spatialStats, modelMetrics }) {
  const [showIntensityHelp, setShowIntensityHelp] = useState(false)
  const [showSpatialHelp, setShowSpatialHelp] = useState(false)

  const intensityMap = [
    ['mean', 'Media', 'AU'],
    ['median', 'Mediana', 'AU'],
    ['max', 'Máximo', 'AU'],
    ['min', 'Mínimo', 'AU'],
    ['std', 'Desviación típica', 'AU'],
  ]

  const spatialMap = [
    ['fluorescent_area', 'Área fluorescente', 'px²'],
    ['fluorescent_percentage', 'Porcentaje fluorescente', '%'],
    ['uniformity', 'Uniformidad', ''],
    ['centroid_x', 'Centroide X', 'px'],
    ['centroid_y', 'Centroide Y', 'px'],
  ]

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 16, color: 'var(--text-heading)' }}>Estadísticas de intensidad</h4>
              <p style={{ margin: '10px 0 18px', color: 'var(--text-hint)', fontSize: 13 }}>
                Resumen de intensidad de la región segmentada.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIntensityHelp((current) => !current)}
              style={{
                border: 'none', background: 'transparent', color: 'var(--rose-600)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0,
              }}
            >
              {showIntensityHelp ? 'Ocultar ayuda' : '¿Qué significa?'}
            </button>
          </div>
          {showIntensityHelp && (
            <div style={{ marginBottom: 16, padding: 14, borderRadius: 'var(--r-sm)', background: 'var(--bg-tint)', color: 'var(--text-body)', fontSize: 13, lineHeight: 1.6 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Indicadores de intensidad</p>
              <ul style={{ margin: '10px 0 0', paddingInlineStart: 18 }}>
                <li>Media y mediana describen el brillo típico dentro de la zona fluorescente.</li>
                <li>Máximo y mínimo muestran los extremos de señal detectada.</li>
                <li>Desviación típica mide la variabilidad de los valores de intensidad.</li>
              </ul>
            </div>
          )}
          {sectionRows(intensityStats, intensityMap)}
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 16, color: 'var(--text-heading)' }}>Estadísticas espaciales</h4>
              <p style={{ margin: '10px 0 18px', color: 'var(--text-hint)', fontSize: 13 }}>
                Métricas de la región fluorescente y su distribución espacial.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSpatialHelp((current) => !current)}
              style={{
                border: 'none', background: 'transparent', color: 'var(--rose-600)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0,
              }}
            >
              {showSpatialHelp ? 'Ocultar ayuda' : '¿Qué significa?'}
            </button>
          </div>
          {showSpatialHelp && (
            <div style={{ marginBottom: 16, padding: 14, borderRadius: 'var(--r-sm)', background: 'var(--bg-tint)', color: 'var(--text-body)', fontSize: 13, lineHeight: 1.6 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Indicadores espaciales</p>
              <ul style={{ margin: '10px 0 0', paddingInlineStart: 18 }}>
                <li>Área indica el tamaño total de la zona fluorescente.</li>
                <li>Porcentaje muestra cuánto del área total es fluorescente.</li>
                <li>El centroide señala la posición media de la región detectada.</li>
                <li>Uniformidad refleja qué tan homogénea es la señal dentro del área.</li>
              </ul>
            </div>
          )}
          {sectionRows(spatialStats, spatialMap)}
        </Card>
      </div>

      <Card style={{ padding: 20 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
            <div>
              <span style={{ color: 'var(--text-hint)', fontSize: 12 }}>Modelo</span>
              <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 600 }}>{modelMetrics?.selected_model ?? '—'}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-hint)', fontSize: 12 }}>R²</span>
              <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 600 }}>{formatStatValue(modelMetrics?.r2)}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-hint)', fontSize: 12 }}>RMSE</span>
              <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 600 }}>{formatStatValue(modelMetrics?.rmse)}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-hint)', fontSize: 12 }}>MAE</span>
              <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 600 }}>{formatStatValue(modelMetrics?.mae)}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-hint)', fontSize: 12 }}>Pendiente</span>
              <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 600 }}>{formatStatValue(modelMetrics?.slope)}</p>
            </div>
          </div>

          {modelMetrics?.equation && (
            <div>
              <span style={{ color: 'var(--text-hint)', fontSize: 12 }}>Ecuación</span>
              <pre style={{ marginTop: 8, padding: 14, borderRadius: 'var(--r-sm)', background: 'var(--bg-tint)', overflowX: 'auto', fontSize: 13, color: 'var(--text-body)' }}>
                {modelMetrics.equation}
              </pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
