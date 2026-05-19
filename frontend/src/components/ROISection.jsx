import React, { useState, useEffect } from 'react'
import { Card, Btn, Spinner } from './ui.jsx'
import { detectROIs, detectArtifacts } from '../lib/api.js'

export default function ROISection({ selectedImage, initialRois = null, initialArtifacts = null, onSelectROI = null }) {
  const [loading, setLoading] = useState(false)
  const [rois, setRois] = useState(initialRois || [])
  const [artifacts, setArtifacts] = useState(initialArtifacts || null)
  const [error, setError] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [selectedROI, setSelectedROI] = useState(null)

  useEffect(() => {
    if (!selectedImage || !selectedImage.file) {
      setRois(initialRois || [])
      setArtifacts(initialArtifacts || null)
      setSelectedROI(null)
      if (onSelectROI) onSelectROI(null)
      return
    }

    setSelectedROI(null)
    if (initialRois) setRois(initialRois)
    if (initialArtifacts) setArtifacts(initialArtifacts)

    if (initialRois) {
      return
    }

    let mounted = true
    async function run() {
      setLoading(true)
      setError('')
      try {
        const r = await detectROIs(selectedImage.file, { threshold: null, min_area: 40 })
        const a = await detectArtifacts(selectedImage.file)
        if (!mounted) return
        setRois(r.rois || [])
        setArtifacts(a.artifacts || null)
      } catch (e) {
        if (!mounted) return
        setError(e.message || 'Error detectando ROIs')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    run()
    return () => { mounted = false }
  }, [selectedImage, initialRois, initialArtifacts, onSelectROI])

  if (!selectedImage) return null

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>Regiones fluorescentes (ROIs)</h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-hint)' }}>Detección automática de zonas verdes representativas de señal fluorescente.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Btn style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => { setRois([]); setArtifacts(null); setError(''); setSelectedROI(null); if (onSelectROI) onSelectROI(null); }}>Limpiar</Btn>
          <Btn style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setShowInfo(true)}>¿Qué significa esto?</Btn>
        </div>
      </div>

      {loading && (
        <div style={{ marginTop: 12 }}>
          <Spinner /> Procesando imagen...
        </div>
      )}

      {error && (
        <p style={{ marginTop: 12, color: 'var(--rose-700)' }}>{error}</p>
      )}

      {/* Info modal explaining ROIs */}
      {showInfo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(2,6,23,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 720, background: 'white', borderRadius: 12, padding: 20 }}>
            {selectedROI ? (
              <>
                <h3 style={{ marginTop: 0 }}>{`ROI — detalles`}</h3>
                <pre style={{ background: '#f7fafc', padding: 12, borderRadius: 6, overflowX: 'auto' }}>{JSON.stringify(selectedROI, null, 2)}</pre>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>¿Qué son las ROIs?</h3>
                <p style={{ color: 'var(--text-body)' }}>
                  Las ROI corresponden a zonas con predominancia de verde en la imagen, calculadas como el <i>green-excess</i> (G − 0.5·(R+B)).
                  Estas áreas suelen indicar presencia de fluoróforos que emiten en el canal verde. Las ROI se extraen mediante umbralización automática y limpieza morfológica.
                </p>
                <p style={{ color: 'var(--text-body)' }}>
                  Interpreta las ROI como regiones candidatas: revisa la columna "Mean GE" para evaluar la intensidad relativa, y la sección de artefactos para descartar ROIs saturadas o desenfocadas.
                </p>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Btn onClick={() => { setShowInfo(false); setSelectedROI(null); if (onSelectROI) onSelectROI(null); }}>Cerrar</Btn>
            </div>
          </div>
        </div>
      )}

      {artifacts && (
        <div style={{ marginTop: 12 }}>
          <strong>Artefactos detectados:</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <div>Sat: {artifacts.saturation_pct.toFixed(2)}%</div>
            <div>Blur var: {artifacts.var_laplacian.toFixed(2)}</div>
            <div>Noise std: {artifacts.noise_std.toFixed(2)}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {rois.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-hint)' }}>No se encontraron ROIs significativas.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {rois.map((r, idx) => (
              <Card key={idx} tint style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{`ROI ${idx + 1}`}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-hint)' }}>Área: {r.area} px • Mean GE: {Number(r.mean_green_excess).toFixed(4)}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-hint)' }}>BBox: {r.bbox.join(', ')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => navigator.clipboard?.writeText(JSON.stringify(r))}>Copiar</Btn>
                  <Btn style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => { setSelectedROI(r); if (onSelectROI) onSelectROI(r); setShowInfo(true); }}>Info</Btn>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
