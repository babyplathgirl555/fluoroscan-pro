import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { postResults, generateReport } from '../lib/api.js'
import { Card, Btn, SectionHeader, Spinner, Pill } from './ui.jsx'
import ImagePanel from './ImagePanel.jsx'
import StatsSection from './StatsSection.jsx'
import InterpretationPanel from './InterpretationPanel.jsx'
import CurveSection from './CurveSection.jsx'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export default function ResultsSection({ images, onBack }) {
  const validImages = useMemo(() => images.filter((img) => img.file), [images])

  const [selectedId, setSelectedId] = useState(validImages[0]?.id?.toString() ?? '')
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [reportStatus, setReportStatus] = useState('idle')
  const [reportError, setReportError] = useState('')
  const [reportFileName, setReportFileName] = useState('')
  const [previewSrc, setPreviewSrc] = useState('')
  const [activeTab, setActiveTab] = useState('images')

  const selectedImage = useMemo(
    () => validImages.find((img) => String(img.id) === selectedId) ?? validImages[0],
    [validImages, selectedId]
  )

  useEffect(() => {
    if (!selectedImage && validImages.length > 0) {
      setSelectedId(validImages[0].id?.toString() ?? '')
    }
  }, [validImages, selectedImage])

  useEffect(() => {
    if (!selectedImage || !selectedImage.file) {
      setPreviewSrc('')
      return
    }
    const url = URL.createObjectURL(selectedImage.file)
    setPreviewSrc(url)
    return () => { try { URL.revokeObjectURL(url) } catch {} }
  }, [selectedImage])

  const calibrationPoints = useMemo(() => {
    return validImages
      .map((img) => {
        const conc = Number(img.conc)
        const intensidad = Number(img.intensidad)
        return Number.isFinite(conc) && Number.isFinite(intensidad) ? { conc, intensidad } : null
      })
      .filter(Boolean)
  }, [validImages])

  const hasCalibration = calibrationPoints.length >= 3
  const concentrations = calibrationPoints.map((item) => item.conc)
  const intensities = calibrationPoints.map((item) => item.intensidad)

  const handleGenerate = useCallback(async () => {
    if (!selectedImage?.file) {
      setError('Seleccione primero una imagen válida.')
      return
    }

    setStatus('loading')
    setError('')
    setResult(null)

    try {
      const data = await postResults({
        file: selectedImage.file,
        concentraciones: hasCalibration ? concentrations : undefined,
        intensidades: hasCalibration ? intensities : undefined,
      })

      setResult(data)
      setStatus('done')
    } catch (err) {
      setError(err.message || 'Error al generar resultados')
      setStatus('error')
    }
  }, [selectedImage, hasCalibration, concentrations, intensities])

  const handleDownloadReport = useCallback(async () => {
    if (!selectedImage?.file) {
      setReportError('Seleccione primero una imagen válida.')
      return
    }

    setReportStatus('loading')
    setReportError('')
    setReportFileName('')

    try {
      const filename = await generateReport({
        file: selectedImage.file,
        sampleName: selectedImage.filename,
        analysisName: 'Análisis de fluorescencia',
        modelName: hasCalibration ? 'Beer-Lambert' : 'FluoroScan Pro',
        concentrationLabel: selectedImage.conc ? `${selectedImage.conc}` : undefined,
        concentraciones: hasCalibration ? concentrations : undefined,
        intensidades: hasCalibration ? intensities : undefined,
      })

      setReportStatus('done')
      setReportFileName(filename)
    } catch (err) {
      setReportError(err.message || 'Error al generar el PDF')
      setReportStatus('error')
    }
  }, [selectedImage, hasCalibration, concentrations, intensities])

  const noImages = validImages.length === 0

  const computedInterpretation = useMemo(() => {
    if (!result) return null
    const r2 = result?.model_metrics?.r2 ?? result?.model_metrics?.r_squared ?? result?.r_squared ?? result?.r2 ?? null
    const interp = result.interpretation ? { ...result.interpretation } : {}
    if (r2 != null && Number(r2) > 0.8) {
      interp.general_conclusion = interp.general_conclusion ?? 'Datos de alta calidad: la señal es consistente y el ajuste del modelo es excelente (R² > 0.8). Resultados apropiados para análisis cuantitativo.'
    }
    return interp
  }, [result])

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <SectionHeader
          num="4"
          title="Resultados científicos"
          subtitle="Genera una vista consolidada con imágenes, estadísticas, métricas de modelos e interpretación automática."
        />

        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 240, flex: 1 }}>
              <p style={{ margin: 0, color: 'var(--text-hint)', fontSize: 13 }}>Imagen activa</p>
              <select
                value={selectedImage?.id ?? ''}
                onChange={(event) => { setSelectedId(event.target.value); setResult(null); setStatus('idle'); setError('') }}
                style={{ width: '100%', marginTop: 10, padding: '11px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-soft)', background: 'var(--bg-tint)', color: 'var(--text-body)' }}
                disabled={noImages}
              >
                {validImages.map((img) => (
                  <option key={img.id} value={img.id}>{img.filename || `imagen-${img.id}`}</option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 240, flex: 1 }}>
              <p style={{ margin: 0, color: 'var(--text-hint)', fontSize: 13 }}>Puntos de calibración</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                <Pill color={hasCalibration ? 'green' : 'neutral'}>{calibrationPoints.length} puntos válidos</Pill>
                <Pill color={hasCalibration ? 'green' : 'rose'}>{hasCalibration ? 'Calibración activa' : 'Se necesitan 3+ puntos'}</Pill>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Btn variant="secondary" onClick={onBack}>Volver</Btn>
              <Btn disabled={noImages || status === 'loading'} onClick={handleGenerate}>
                {status === 'loading' ? (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Spinner size={18} /> Generando</span>) : 'Generar resultados'}
              </Btn>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Card tint style={{ padding: '16px 18px' }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-hint)', textTransform: 'uppercase' }}>Intensidad media</p>
              <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--text-heading)' }}>{selectedImage?.intensidad ?? '—'}</p>
            </Card>
            <Card tint style={{ padding: '16px 18px' }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-hint)', textTransform: 'uppercase' }}>Concentración</p>
              <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--text-heading)' }}>{selectedImage?.conc ?? '—'}</p>
            </Card>
          </div>
        </Card>

        {error && (
          <Card style={{ padding: 18, borderColor: 'var(--rose-300)' }}>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--rose-700)' }}>Error</p>
            <p style={{ marginTop: 8, color: 'var(--text-body)' }}>{error}</p>
          </Card>
        )}
      </div>

      {/* Si no hay resultados, no mostramos nada debajo del panel superior */}
      {!result ? null : (
        <div style={{ display: 'grid', gap: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn
              variant="primary"
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }}
              onClick={() => setActiveTab('images')}
            >
              Imágenes
            </Btn>

            <Btn
              variant="primary"
              disabled={!result}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8, opacity: result ? 1 : 0.6 }}
              onClick={() => setActiveTab('results')}
            >
              Resultados
            </Btn>
          </div>

          <div style={{ transition: 'all .18s ease' }}>
            {activeTab === 'images' && (
              <ImagePanel images={{ original: result?.images?.original ?? previewSrc, heatmap: result?.images?.heatmap ?? null, overlay: result?.images?.overlay ?? null }} />
            )}

            {activeTab === 'results' && (
              <div>
                <div style={{ display: 'grid', gap: 24 }}>
                  <StatsSection intensityStats={result.intensity_stats} spatialStats={result.spatial_stats} modelMetrics={result.model_metrics} />

                  <CurveSection selectedImage={selectedImage} result={result} calibrationPoints={calibrationPoints} />

                  <InterpretationPanel interpretation={computedInterpretation} />

                  <Card style={{ padding: 24, borderColor: reportError ? 'var(--rose-300)' : 'var(--border-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-heading)' }}>Generar Reporte PDF</h3>
                        <p style={{ margin: '8px 0 0', color: 'var(--text-body)', fontSize: 13, maxWidth: 620 }}>Descarga un reporte científico profesional con portada, métricas, imágenes, gráficas y conclusiones.</p>
                      </div>
                      <Btn disabled={reportStatus === 'loading'} onClick={handleDownloadReport}>
                        {reportStatus === 'loading' ? (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Spinner size={18} /> Generando PDF</span>) : 'Generar Reporte PDF'}
                      </Btn>
                    </div>

                    {reportError && (<p style={{ marginTop: 16, color: 'var(--rose-700)', fontWeight: 600 }}>{reportError}</p>)}
                    {reportStatus === 'done' && reportFileName && (<p style={{ marginTop: 16, color: 'var(--ok-text)' }}>Reporte descargado: <strong>{reportFileName}</strong></p>)}
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
