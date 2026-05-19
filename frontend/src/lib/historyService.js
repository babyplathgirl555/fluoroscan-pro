/**
 * historyService.js
 * Persistencia de análisis en localStorage.
 * Guarda campos del nuevo sistema biofísico (comparación de modelos).
 */

const KEY = 'fs_history'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
  catch { return [] }
}

function save(entries) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export const historyService = {
  getAll() {
    return load().reverse()
  },

  add({ concentraciones, intensidades, results, imageNames = [] }) {
    const entries = load()
    const comp = results.comparacion ?? {}

    const entry = {
      id: Date.now().toString(36),
      fecha: new Date().toISOString(),
      imageNames,
      concentraciones,
      intensidades,

      // 🔥 RESULTADO PRINCIPAL
      concentracion_optima: results.concentracion_optima ?? null,
      intensidad_maxima: results.intensidad_maxima ?? null,
      r_squared: results.r_squared ?? null,
      modelo_seleccionado: results.modelo_seleccionado ?? null,

      // 🔥 AHORA SÍ ALINEADO CON FRONTEND
      comparacion: {
        empirico: {
          exitoso: comp.empirico?.exitoso ?? false,
          r2: comp.empirico?.r2 ?? null,
          rmse: comp.empirico?.rmse ?? null,
          aic: comp.empirico?.aic ?? null,
          c_opt: comp.empirico?.c_opt ?? null,
          params: comp.empirico?.params ?? null,
        },
        biofisico: {
          exitoso: comp.biofisico?.exitoso ?? false,
          r2: comp.biofisico?.r2 ?? null,
          rmse: comp.biofisico?.rmse ?? null,
          aic: comp.biofisico?.aic ?? null,
          c_opt: comp.biofisico?.c_opt ?? null,
          params: comp.biofisico?.params ?? null,
        }
      },

      interpretacion: results.interpretacion ?? null,
    }

    entries.push(entry)
    save(entries)
    return entry
  },

  remove(id) {
    save(load().filter(e => e.id !== id))
  },

  clear() {
    localStorage.removeItem(KEY)
  },
}