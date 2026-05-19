import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, Btn, Input, SectionHeader, Pill } from './ui.jsx'
import HeatmapSection from './HeatmapSection.jsx'

export default function TableSection({ images, setImages, onBack, onNext }) {
  const updateConc = (id, val) => {
    setImages(prev =>
      prev.map(img => img.id === id ? { ...img, conc: val } : img)
    )
  }

  const allFilled = images.length > 0 &&
    images.every(img => img.conc.trim() !== '' && !isNaN(parseFloat(img.conc)) && parseFloat(img.conc) > 0)

  return (
    <div>
      <SectionHeader
        num="02"
        title="Asignar concentraciones"
        subtitle="Ingresa la concentración (mg/mL) para cada imagen cargada"
      />

      <Card style={{ overflow: 'hidden', marginBottom: 20 }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '48px 1fr 180px 100px 80px',
          background: 'var(--rose-900)', gap: 0,
        }}>
          {['#', 'Imagen', 'Concentración (mg/mL)', 'Intensidad', 'Preview'].map(col => (
            <div key={col} style={{
              padding: '11px 16px', fontSize: 11, fontWeight: 600,
              color: 'var(--rose-100)', letterSpacing: '.04em',
              textTransform: 'uppercase',
            }}>{col}</div>
          ))}
        </div>

        {/* Rows */}
        <AnimatePresence>
          {images.map((img, i) => {
            const concVal  = parseFloat(img.conc)
            const concOk   = img.conc !== '' && !isNaN(concVal) && concVal > 0
            const concWarn = img.conc !== '' && !concOk

            return (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * .04 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr 180px 100px 80px',
                  background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-tint)',
                  borderBottom: '1px solid var(--border-soft)',
                  alignItems: 'center',
                  transition: 'background var(--t-fast)',
                }}
                whileHover={{ background: 'var(--rose-50)' }}
              >
                {/* # */}
                <div style={{ padding: '12px 16px', fontSize: 12,
                               color: 'var(--text-hint)', textAlign: 'center' }}>
                  {i + 1}
                </div>

                {/* Filename */}
                <div style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-body)',
                               overflow: 'hidden', textOverflow: 'ellipsis',
                               whiteSpace: 'nowrap', maxWidth: 200 }}>
                    {img.filename}
                  </p>
                </div>

                {/* Input concentración */}
                <div style={{ padding: '8px 12px' }}>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={img.conc}
                    onChange={e => updateConc(img.id, e.target.value)}
                    style={{
                      borderColor: concWarn ? 'var(--rose-400)' : undefined,
                    }}
                  />
                </div>

                {/* Intensidad */}
                <div style={{ padding: '12px 16px' }}>
                  <Pill color={img.ok ? 'rose' : 'neutral'}>
                    {img.ok ? `${img.intensidad.toFixed(1)}` : '—'}
                  </Pill>
                </div>

                {/* Preview */}
                <div style={{ padding: '8px 12px' }}>
                  <img src={img.preview} alt=""
                       style={{ width: 44, height: 44, objectFit: 'cover',
                                borderRadius: 6,
                                border: '1px solid var(--border-soft)' }} />
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {images.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--rose-50)', margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                   stroke="var(--rose-300)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
              </svg>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-hint)' }}>
              Carga imágenes para ver la tabla aquí.
            </p>
          </div>
        )}
      </Card>

      {/* Heatmap preview */}
      {images.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <HeatmapSection images={images} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Btn variant="secondary" onClick={onBack}>← Volver</Btn>
        <Btn onClick={onNext} disabled={!allFilled}>
          Analizar datos →
        </Btn>
      </div>
    </div>
  )
}
