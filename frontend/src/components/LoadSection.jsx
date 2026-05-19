import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Btn, Card, Pill, SectionHeader, Spinner } from './ui.jsx'
import { processImage } from '../lib/api.js'

export default function LoadSection({ images, setImages, onNext }) {
  const [uploading, setUploading]     = useState(false)
  const [error,     setError]         = useState(null)
  const [expanded,  setExpanded]      = useState(null)  // id de imagen expandida
  const [activeTab, setActiveTab]     = useState({})    // tab activa por imagen

  const processFiles = useCallback(async (files) => {
    setError(null)
    setUploading(true)
    const results = []
    for (const file of files) {
      try {
        const res = await processImage(file)
        results.push({
          id:         Math.random().toString(36).slice(2),
          file,
          filename:   file.name,
          preview:    URL.createObjectURL(file),
          intensidad: res.intensidad,
          area:       res.area       || 0,
          snr:        res.snr        || 0,
          contraste:  res.contraste  || 0,
          ok:         res.ok,
          error:      res.error,
          conc:       '',
          // Imágenes procesadas del backend
          imagenes:   res.imagenes   || null,
        })
      } catch (e) {
        results.push({
          id:         Math.random().toString(36).slice(2),
          file,
          filename:   file.name,
          preview:    URL.createObjectURL(file),
          intensidad: 0,
          area:       0,
          snr:        0,
          contraste:  0,
          ok:         false,
          error:      e.message,
          conc:       '',
          imagenes:   null,
        })
      }
    }
    setImages(prev => [...prev, ...results])
    setUploading(false)
  }, [setImages])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: { 'image/jpeg': [], 'image/png': [] },
    multiple: true,
  })

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id))
    if (expanded === id) setExpanded(null)
  }

  const toggleExpand = (id) => {
    setExpanded(prev => prev === id ? null : id)
    setActiveTab(prev => ({ ...prev, [id]: prev[id] || 'original' }))
  }

  const setTab = (id, tab) => {
    setActiveTab(prev => ({ ...prev, [id]: tab }))
  }

  const TABS = [
    { key: 'original',    label: 'Original'   },
    { key: 'mascara',     label: 'Máscara'    },
    { key: 'overlay',     label: 'Overlay'    },
    { key: 'comparacion', label: 'Comparación'},
    { key: 'heatmap',     label: 'Heatmap'    },
  ]

  return (
    <div>
      <SectionHeader
        num="01"
        title="Cargar imágenes"
        subtitle="Selecciona una o varias imágenes de fluorescencia"
      />

      {/* ── Drop zone ──────────────────────────────────────────────────── */}
      <Card style={{ overflow: 'hidden', marginBottom: 16 }}>
        <motion.div
          {...getRootProps()}
          animate={{
            background:  isDragActive ? 'var(--rose-50)'   : 'var(--bg-surface)',
            borderColor: isDragActive ? 'var(--rose-400)'  : 'var(--border-soft)',
          }}
          style={{
            border: '1.5px dashed var(--border-mid)',
            borderRadius: 'var(--r-lg)',
            padding: '44px 32px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all var(--t-base)',
          }}
        >
          <input {...getInputProps()} />

          <motion.div
            animate={{ scale: isDragActive ? 1.08 : 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: isDragActive ? 'var(--rose-100)' : 'var(--rose-50)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
              border: '1px solid var(--rose-100)',
            }}
          >
            <CloudUpIcon color={isDragActive ? 'var(--rose-500)' : 'var(--rose-300)'} />
          </motion.div>

          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 16, fontWeight: 600,
            color: 'var(--text-heading)', marginBottom: 6,
          }}>
            {isDragActive ? 'Suelta las imágenes aquí' : 'Selecciona imágenes de fluorescencia'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 20 }}>
            Formatos soportados: JPG · PNG · JPEG
          </p>

          <Btn variant="primary" style={{ pointerEvents: 'none' }}>
            {uploading ? <><Spinner size={14} /> Procesando…</> : '＋  Cargar imágenes'}
          </Btn>

          <AnimatePresence>
            {images.length > 0 && !uploading && (
                <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ marginTop: 16, display: 'flex', alignItems: 'center',
                         justifyContent: 'center', gap: 6 }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {images.length} imagen{images.length > 1 ? 'es' : ''} cargada{images.length > 1 ? 's' : ''}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Card>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ fontSize: 12, color: 'var(--rose-700)',
                     background: 'var(--rose-50)',
                     border: '1px solid var(--rose-200)',
                     borderRadius: 8, padding: '8px 14px', marginBottom: 16 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Lista de imágenes con máscaras ─────────────────────────────── */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}
          >
            {images.map((img, i) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * .05 }}
              >
                <Card style={{ overflow: 'hidden' }}>

                  {/* ── Fila resumen ─────────────────────────────────── */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px',
                    cursor: img.ok && img.imagenes ? 'pointer' : 'default',
                  }}
                    onClick={() => img.ok && img.imagenes && toggleExpand(img.id)}
                  >
                    {/* Miniatura */}
                    <img
                      src={img.preview}
                      alt={img.filename}
                      style={{
                        width: 52, height: 52,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid var(--border-soft)',
                        flexShrink: 0,
                      }}
                    />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 12, fontWeight: 600,
                        color: 'var(--text-body)',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {img.filename}
                      </p>

                      {img.ok ? (
                        <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                          <MetricChip label="Intensidad" value={img.intensidad.toFixed(2)} unit="u.a." />
                          <MetricChip label="Área"       value={img.area}                  unit="px"   />
                          <MetricChip label="SNR"        value={img.snr.toFixed(2)}                   />
                          <MetricChip label="Contraste"  value={img.contraste.toFixed(3)}             />
                        </div>
                      ) : (
                        <p style={{ fontSize: 11, color: 'var(--warn)', marginTop: 4 }}>
                          Advertencia: {img.error || 'Error al procesar'}
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {img.ok && img.imagenes && (
                        <span style={{
                          fontSize: 10, color: 'var(--rose-500)',
                          border: '1px solid var(--rose-200)',
                          borderRadius: 6, padding: '3px 8px',
                          background: 'var(--rose-50)',
                        }}>
                          {expanded === img.id ? '▲ Ocultar' : '▼ Ver máscaras'}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'var(--rose-50)',
                          border: '1px solid var(--rose-200)',
                          cursor: 'pointer', color: 'var(--rose-500)',
                          fontSize: 10, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >✕</button>
                    </div>
                  </div>

                  {/* ── Panel de máscaras expandible ─────────────────── */}
                  <AnimatePresence>
                    {expanded === img.id && img.imagenes && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: .25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        {/* Divisor */}
                        <div style={{ height: 1, background: 'var(--border-soft)' }} />

                        {/* Tabs */}
                        <div style={{
                          display: 'flex', gap: 4,
                          padding: '10px 16px 0',
                          borderBottom: '1px solid var(--border-soft)',
                        }}>
                          {TABS.map(tab => {
                            const isActive = (activeTab[img.id] || 'original') === tab.key
                            return (
                              <button
                                key={tab.key}
                                onClick={() => setTab(img.id, tab.key)}
                                style={{
                                  padding: '6px 14px',
                                  fontSize: 11, fontWeight: isActive ? 600 : 400,
                                  color: isActive ? 'var(--rose-600)' : 'var(--text-muted)',
                                  background: 'none', border: 'none',
                                  borderBottom: isActive
                                    ? '2px solid var(--rose-500)'
                                    : '2px solid transparent',
                                  cursor: 'pointer',
                                  marginBottom: -1,
                                  transition: 'all var(--t-fast)',
                                }}
                              >
                                {tab.label}
                              </button>
                            )
                          })}
                        </div>

                        {/* Imagen activa */}
                        <div style={{ padding: 16 }}>
                          <MaskImage
                            src={img.imagenes[activeTab[img.id] || 'original']}
                            label={TABS.find(t => t.key === (activeTab[img.id] || 'original'))?.label}
                          />

                          {/* Descripción del tab */}
                          <p style={{
                            fontSize: 10, color: 'var(--text-hint)',
                            marginTop: 8, textAlign: 'center',
                          }}>
                            {TAB_DESCRIPTIONS[activeTab[img.id] || 'original']}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Botón continuar ────────────────────────────────────────────── */}
      {images.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn onClick={onNext}>Continuar →</Btn>
        </div>
      )}
    </div>
  )
}

// ── Descripción de cada tab ───────────────────────────────────────────────────
const TAB_DESCRIPTIONS = {
  original:    'Imagen original sin procesar',
  mascara:     'Máscara binaria: blanco = fluorescencia detectada, negro = fondo',
  overlay:     'Superposición de la máscara verde sobre la imagen original',
  comparacion: 'Comparación lado a lado: Original · Máscara · Overlay',
  heatmap:     'Mapa de calor de intensidad: zonas verdes = mayor fluorescencia',
}

// ── Componente: imagen en base64 ──────────────────────────────────────────────
function MaskImage({ src, label }) {
  if (!src) return (
    <div style={{
      height: 200, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-deep)',
      borderRadius: 8, color: 'var(--text-hint)', fontSize: 12,
    }}>
      Sin imagen disponible
    </div>
  )

  return (
    <motion.div
      key={src}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: .2 }}
      style={{
        borderRadius: 8, overflow: 'hidden',
        border: '1px solid var(--border-soft)',
        background: '#000',
      }}
    >
      <img
        src={`data:image/png;base64,${src}`}
        alt={label}
        style={{
          width: '100%',
          maxHeight: 320,
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </motion.div>
  )
}

// ── Componente: chip de métrica ───────────────────────────────────────────────
function MetricChip({ label, value, unit }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'var(--rose-50)',
      border: '1px solid var(--rose-100)',
      borderRadius: 6, padding: '2px 8px',
    }}>
      <span style={{ fontSize: 9, color: 'var(--text-hint)' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--rose-700)' }}>
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  )
}

// ── Ícono ─────────────────────────────────────────────────────────────────────
function CloudUpIcon({ color }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  )
}
