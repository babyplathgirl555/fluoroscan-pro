import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pill } from './ui.jsx'

const STEP_LABELS = {
  load:    'Cargar imágenes',
  table:   'Concentraciones',
  analyze: 'Analizar',
  results: 'Resultados',
}
const STEPS = ['load', 'table', 'analyze', 'results']

export default function Header({ activeSection, imageCount, onOpenHistory, onOpenSettings }) {
  const stepIdx = STEPS.indexOf(activeSection)

  return (
    <header style={{
      padding: '0 40px',
      background: 'var(--bg-page)',
      borderBottom: '1px solid var(--border-soft)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Title row */}
      <div style={{
        padding: '24px 0 16px',
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-hint)',
                       textTransform: 'uppercase', letterSpacing: '.08em',
                       marginBottom: 4 }}>
            Análisis de
          </p>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 28, fontWeight: 700, lineHeight: 1,
            color: 'var(--text-heading)',
          }}>
            Fluorescencia
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>
            Detección cuantitativa de señal fluorescente en imágenes biomédicas
          </p>
        </div>

        {/* Status pill + icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
          <Pill color={imageCount > 0 ? 'green' : 'rose'}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: imageCount > 0 ? 'var(--ok)' : 'var(--rose-400)',
              display: 'inline-block',
            }}/>
            {imageCount > 0 ? `${imageCount} imagen${imageCount > 1 ? 'es' : ''}` : 'Sin datos'}
          </Pill>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onOpenHistory?.()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onOpenHistory?.()
            }}
            title="Ver historial"
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--bg-tint)', border: '1px solid var(--border-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                 stroke="var(--text-muted)" strokeWidth="1.8">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onOpenSettings?.()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onOpenSettings?.()
            }}
            title="Abrir ajustes"
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--bg-tint)', border: '1px solid var(--border-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                 stroke="var(--text-muted)" strokeWidth="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Step progress */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 0, paddingBottom: 0, marginLeft: -4,
      }}>
        {STEPS.map((step, i) => {
          const done    = i < stepIdx
          const current = i === stepIdx

          return (
            <React.Fragment key={step}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 4px',
                borderBottom: current
                  ? '2px solid var(--rose-500)'
                  : '2px solid transparent',
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: done    ? 'var(--ok)'       :
                              current ? 'var(--rose-500)' : 'var(--border-mid)',
                  color: (done || current) ? '#fff' : 'var(--text-hint)',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background var(--t-base)',
                  flexShrink: 0,
                }}>
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : i + 1}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: current ? 600 : 400,
                  color: current ? 'var(--rose-600)' :
                         done    ? 'var(--ok-text)'  : 'var(--text-hint)',
                  whiteSpace: 'nowrap',
                  transition: 'color var(--t-base)',
                }}>
                  {STEP_LABELS[step]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 24, height: 1,
                  background: i < stepIdx ? 'var(--ok)' : 'var(--border-soft)',
                  margin: '0 4px',
                  transition: 'background var(--t-base)',
                }} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </header>
  )
}
