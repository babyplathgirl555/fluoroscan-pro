import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card } from './ui.jsx'

const ROSE = '#E0286F'

// Función para convertir valor normalizado a color en escala de calor (VERDE)
function valueToHeatmapColor(value, min, max) {
  if (max === min) return '#22c55e' // Verde medio si todos los valores son iguales

  const normalized = (value - min) / (max - min) // [0, 1]

  // Escala de verde: negro/oscuro → verde claro → verde brillante
  const colors = [
    { pos: 0.0, r: 20, g: 20, b: 20 },        // Negro/muy oscuro
    { pos: 0.2, r: 34, g: 74, b: 0 },         // Verde muy oscuro
    { pos: 0.4, r: 101, g: 163, b: 13 },      // Verde oscuro
    { pos: 0.6, r: 134, g: 239, b: 37 },      // Verde medio
    { pos: 0.8, r: 187, g: 247, b: 208 },     // Verde claro
    { pos: 1.0, r: 34, g: 197, b: 94 },       // Verde brillante fluorescente
  ]

  let color1, color2, ratio
  for (let i = 0; i < colors.length - 1; i++) {
    if (normalized >= colors[i].pos && normalized <= colors[i + 1].pos) {
      color1 = colors[i]
      color2 = colors[i + 1]
      ratio = (normalized - color1.pos) / (color2.pos - color1.pos)
      break
    }
  }

  if (!color1 || !color2) {
    color1 = colors[colors.length - 1]
    return `rgb(${color1.r}, ${color1.g}, ${color1.b})`
  }

  const r = Math.round(color1.r + (color2.r - color1.r) * ratio)
  const g = Math.round(color1.g + (color2.g - color1.g) * ratio)
  const b = Math.round(color1.b + (color2.b - color1.b) * ratio)

  return `rgb(${r}, ${g}, ${b})`
}

export default function HeatmapSection({ images }) {
  // Preparar datos del heatmap
  const { heatmapData, minIntensity, maxIntensity, concValues } = useMemo(() => {
    if (!images || images.length === 0) {
      return { heatmapData: [], minIntensity: 0, maxIntensity: 1, concValues: [] }
    }

    // Filtrar imágenes con valores válidos
    const validImages = images.filter(
      img => img.ok && typeof img.intensidad === 'number' && typeof img.conc === 'string'
    )

    if (validImages.length === 0) {
      return { heatmapData: [], minIntensity: 0, maxIntensity: 1, concValues: [] }
    }

    // Extraer concentraciones e intensidades
    const concentrations = validImages.map(img => parseFloat(img.conc) || 0)
    const intensities = validImages.map(img => img.intensidad)

    // Encontrar min/max
    const minInt = Math.min(...intensities)
    const maxInt = Math.max(...intensities)

    // Crear datos para el heatmap
    const data = validImages.map((img, idx) => ({
      index: idx,
      filename: img.filename.substring(0, 20),
      concentration: parseFloat(img.conc) || 0,
      intensity: img.intensidad,
    }))

    return {
      heatmapData: data,
      minIntensity: minInt,
      maxIntensity: maxInt,
      concValues: concentrations,
    }
  }, [images])

  if (heatmapData.length === 0) {
    return (
      <Card style={{
        padding: '40px 24px',
        textAlign: 'center',
        background: 'var(--rose-50)',
        border: '1px dashed var(--rose-200)',
      }}>
        <p style={{ fontSize: 13, color: 'var(--text-hint)', margin: 0 }}>
          El heatmap aparecerá cuando tengas imágenes procesadas
        </p>
      </Card>
    )
  }

  return (
    <Card style={{ overflow: 'hidden', padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-hint)',
          textTransform: 'uppercase',
          letterSpacing: '.5px',
          marginBottom: 4,
        }}>
          Heatmap de intensidad de fluorescencia
        </p>
        <p style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          margin: 0,
        }}>
          Visualización de intensidad verde: mayor señal verde indica mayor presencia de fluorescencia.
        </p>
      </div>

      {/* Leyenda de colores */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        padding: '12px 14px',
        background: 'var(--bg-deep)',
        borderRadius: 8,
      }}>
        <span style={{ fontSize: 9, color: 'var(--text-hint)', fontWeight: 600 }}>Min</span>

        {/* Gradiente visual */}
        <div style={{
          flex: 1,
          height: 20,
          borderRadius: 4,
          background: 'linear-gradient(to right, rgb(12, 51, 0), rgb(33, 99, 4), rgb(84, 181, 11), rgb(145, 212, 33), rgb(187, 247, 208))',
          border: '1px solid var(--border-soft)',
        }} />

        <span style={{ fontSize: 9, color: 'var(--text-hint)', fontWeight: 600 }}>Max</span>
      </div>

      {/* Grid de células */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(heatmapData.length, 6)}, 1fr)`,
        gap: 10,
        marginBottom: 16,
      }}>
        {heatmapData.map((item, idx) => {
          const color = valueToHeatmapColor(item.intensity, minIntensity, maxIntensity)

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                padding: 14,
                borderRadius: 10,
                background: color,
                border: '2px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 120,
                position: 'relative',
                overflow: 'hidden',
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              {/* Overlay oscuro para mejorar legibilidad */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.15)',
              }} />

              {/* Contenido */}
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <p style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#fff',
                  margin: '0 0 4px 0',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}>
                  {item.filename}
                </p>
                <p style={{
                  fontSize: 9,
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: '4px 0 0 0',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}>
                  Conc: {item.concentration.toFixed(3)} mg/mL
                </p>
                <p style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  margin: '8px 0 0 0',
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}>
                  {item.intensity.toFixed(2)}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Estadísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        paddingTop: 16,
        borderTop: '1px solid var(--border-soft)',
      }}>
        <div style={{
          padding: '12px 14px',
          background: 'var(--bg-deep)',
          borderRadius: 8,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 9, color: 'var(--text-hint)', margin: 0, marginBottom: 4 }}>
            Intensidad mínima
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: ROSE, margin: 0 }}>
            {minIntensity.toFixed(2)}
          </p>
        </div>

        <div style={{
          padding: '12px 14px',
          background: 'var(--bg-deep)',
          borderRadius: 8,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 9, color: 'var(--text-hint)', margin: 0, marginBottom: 4 }}>
            Intensidad máxima
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: ROSE, margin: 0 }}>
            {maxIntensity.toFixed(2)}
          </p>
        </div>
      </div>
    </Card>
  )
}
