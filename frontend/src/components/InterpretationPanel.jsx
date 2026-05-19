import React from 'react'
import { Card, Pill } from './ui.jsx'

function InterpretationList({ title, items }) {
  return (
    <Card style={{ padding: 18 }}>
      <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text-heading)' }}>{title}</h4>
      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <div key={index} style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: 'var(--text-body)', fontSize: 14, fontWeight: 600 }}>{item.title ?? item}</span>
              {item.detail && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.detail}</span>}
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: 'var(--text-hint)' }}>No hay interpretaciones disponibles.</p>
        )}
      </div>
    </Card>
  )
}

export default function InterpretationPanel({ interpretation }) {
  const general = interpretation?.general_conclusion ?? interpretation?.general
  const intensityItems = interpretation?.intensity_analysis ?? interpretation?.intensity ?? []
  const modelItems = interpretation?.model_analysis ?? interpretation?.model ?? []
  const spatialItems = interpretation?.spatial_analysis ?? []

  if (!interpretation) {
    return (
      <Card style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ margin: 0, color: 'var(--text-hint)' }}>
          La interpretación automática estará disponible al generar resultados.
        </p>
      </Card>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-heading)' }}>Conclusión principal</h3>
            <p style={{ margin: '10px 0 0', color: 'var(--text-body)', fontSize: 14, lineHeight: 1.7 }}>
              {general || 'El análisis sugiere una presencia significativa de fluorescencia; revisa intensidad, modelo y distribución espacial para validar los resultados.'}
            </p>
            <p style={{ margin: '12px 0 0', color: 'var(--text-hint)', fontSize: 12, lineHeight: 1.6 }}>
              El resultado resume la calidad de la señal, el ajuste del modelo y la forma de la región fluorescente.
            </p>
          </div>
          <Pill color="green">Interpretación automática</Pill>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        <InterpretationList title="Intensidad" items={intensityItems} />
        <InterpretationList title="Modelo" items={modelItems} />
        <InterpretationList title="Espacial" items={spatialItems} />
      </div>
    </div>
  )
}
