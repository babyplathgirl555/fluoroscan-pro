import React, { useState } from 'react'
import { Card, Pill } from './ui.jsx'

export default function ImagePanel({ images }) {
  const [previewSrc, setPreviewSrc] = useState('')

  if (!images) {
    return (
      <Card style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ margin: 0, color: 'var(--text-hint)' }}>
          No se encontraron imágenes de resultados para mostrar.
        </p>
      </Card>
    )
  }

  const formatSrc = (src) => {
    if (!src) return ''
    if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http')) return src
    return `data:image/png;base64,${src}`
  }

  const tiles = [
    { key: 'original', label: 'Original', src: formatSrc(images.original) },
    { key: 'heatmap', label: 'Heatmap', src: formatSrc(images.heatmap) },
    { key: 'overlay', label: 'Superposición', src: formatSrc(images.overlay) },
  ]

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-heading)' }}>Imágenes de resultados</h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-hint)', fontSize: 13 }}>
            Toca una imagen para verla en tamaño ampliado.
          </p>
        </div>
        <Pill color="green">3 vistas</Pill>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {tiles.map((tile) => (
          <Card
            key={tile.key}
            style={{ cursor: 'pointer', overflow: 'hidden', minHeight: 250, display: 'flex', flexDirection: 'column' }}
            onClick={() => setPreviewSrc(tile.src)}
          >
            <div style={{ padding: 16, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-hint)' }}>{tile.label}</span>
            </div>
            <div style={{ flex: 1, minHeight: 180, background: 'var(--bg-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, position: 'relative' }}>
              <img
                src={tile.src}
                alt={tile.label}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--r-sm)' }}
              />
            </div>
          </Card>
        ))}
      </div>

      {previewSrc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 760, maxHeight: '80vh', borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,0.35)' }}>
            <button
              onClick={() => setPreviewSrc('')}
              style={{ position: 'absolute', top: 14, right: 14, zIndex: 51, border: 'none', background: 'rgba(255,255,255,0.95)', borderRadius: 999, width: 34, height: 34, cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
            >
              ×
            </button>
            <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'hidden', position: 'relative' }}>
              <img
                src={previewSrc}
                alt="Preview ampliado"
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--r-lg)', maxHeight: '76vh' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
