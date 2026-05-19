import React, { useState, useEffect } from 'react'
import { Card } from './ui.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

function normalizeHistogram(hist) {
  const maxValue = Math.max(...hist.map((item) => item.value)) || 1
  return hist.map((item) => ({ ...item, value: Number((item.value / maxValue).toFixed(3)) }))
}

async function computeImageAnalytics(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const width = 220
      const height = 220
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      const data = ctx.getImageData(0, 0, width, height).data
      const bins = new Array(24).fill(0)
      const profile = []
      const row = Math.floor(height / 2)

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const idx = (y * width + x) * 4
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          const greenSignal = Math.max(0, g - (r + b) / 2)
          const normalized = Math.min(255, Math.max(0, greenSignal))
          const bin = Math.min(23, Math.floor((normalized / 256) * bins.length))
          bins[bin] += 1
          if (y === row) {
            profile.push({ x, intensity: Number(normalized.toFixed(2)) })
          }
        }
      }

      const histogram = bins.map((value, index) => ({
        bin: `${Math.round((index * 255) / bins.length)}-${Math.round(((index + 1) * 255) / bins.length)}`,
        value,
      }))

      resolve({ histogram: normalizeHistogram(histogram), profile })
    }

    img.onerror = () => reject(new Error('No se pudo cargar la imagen para análisis'))
    img.src = imageUrl
  })
}

export default function CurveSection({ selectedImage, result, calibrationPoints }) {
  const [analytics, setAnalytics] = useState({ histogram: [], profile: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedImage?.preview) {
      setAnalytics({ histogram: [], profile: [] })
      return
    }

    let active = true
    setLoading(true)

    computeImageAnalytics(selectedImage.preview)
      .then((data) => {
        if (active) {
          setAnalytics(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setAnalytics({ histogram: [], profile: [] })
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [selectedImage])

  return (
    <Card style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-heading)' }}>Perfiles y curva</h3>
          <p style={{ margin: '8px 0 0', color: 'var(--text-hint)', fontSize: 13 }}>
            El histograma muestra cuánto del área tiene señal verde dominante; el perfil central representa esa señal a lo largo de la mitad horizontal de la imagen para detectar picos y simetrías.
          </p>
        </div>
        <div style={{ display: 'grid', gap: 6, textAlign: 'right' }}>
          <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>Calibración</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-body)' }}>{calibrationPoints.length} puntos</span>
        </div>
      </div>

      {result?.grafica_b64 ? (
        <div style={{ marginTop: 22, borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-tint)' }}>
          <img
            src={`data:image/png;base64,${result.grafica_b64}`}
            alt="Gráfica del modelo"
            style={{ width: '100%', display: 'block', objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div style={{ marginTop: 22, display: 'grid', gap: 20 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 34 }}>
              <span style={{ color: 'var(--text-hint)' }}>Calculando perfil de imagen...</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: '1.4fr 1fr', minHeight: 280 }}>
              <Card tint style={{ padding: 18 }}>
                <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text-heading)' }}>Histograma de verde dominante</h4>
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.histogram} margin={{ top: 12, right: 0, left: 0, bottom: 8 }}>
                      <XAxis dataKey="bin" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => value.toFixed ? value.toFixed(2) : value} />
                      <Bar dataKey="value" fill="var(--ok)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card tint style={{ padding: 18 }}>
                <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text-heading)' }}>Perfil central de verde</h4>
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.profile} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                      <XAxis dataKey="x" tick={false} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                      <Line dataKey="intensity" stroke="var(--ok)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
