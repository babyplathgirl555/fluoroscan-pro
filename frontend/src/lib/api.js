// api.js — Cliente HTTP para FluoroScan Pro (VERSIÓN MEJORADA Y CORREGIDA)

// 🔥 BASE URL (clave si algo no conecta)
const BASE_URL = 'https://fluoroscan-pro.onrender.com'

// ─────────────────────────────────────────────────────────────
// 🧠 UTILIDAD: manejar errores de backend de forma consistente
// ─────────────────────────────────────────────────────────────
async function parseError(res) {
  try {
    const err = await res.json();
    return err.detail || JSON.stringify(err);
  } catch {
    return `HTTP ${res.status}`;
  }
}

// ─────────────────────────────────────────────────────────────
// 🟢 HEALTH CHECK
// ─────────────────────────────────────────────────────────────
export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    console.warn('Advertencia: Backend no disponible en /health');
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// 🖼️ PROCESAR IMAGEN
// ─────────────────────────────────────────────────────────────
export async function processImage(file) {
  console.log(`Subiendo imagen: ${file.name}...`);

  try {
    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch(`${BASE_URL}/api/process-image`, {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      const errorMsg = await parseError(res);
      throw new Error(errorMsg);
    }

    const data = await res.json();

    if (data.intensidad === undefined) {
      throw new Error('Respuesta inválida del backend (falta intensidad)');
    }

    console.log(`Imagen procesada → intensidad: ${data.intensidad}`);
    return data;

  } catch (e) {
    console.error(`❌ processImage: ${e.message}`);
    throw new Error(e.message || 'Error procesando imagen');
  }
}

// ─────────────────────────────────────────────────────────────
// 📊 ANALIZAR DATOS (CORREGIDO Y ROBUSTO)
// ─────────────────────────────────────────────────────────────
export async function analyzeData({ concentraciones, intensidades, imagenes = [] }) {
  console.log('📊 Enviando datos al modelo (empírico + Beer-Lambert)...');

  try {
    // 🔥 VALIDACIÓN PREVIA (MUY IMPORTANTE)
    if (!Array.isArray(concentraciones) || !Array.isArray(intensidades)) {
      throw new Error('Concentraciones o intensidades inválidas');
    }

    if (concentraciones.length < 3) {
      throw new Error('Se necesitan al menos 3 datos');
    }

    const payload = {
      concentraciones,
      intensidades,
      imagenes
    };

    console.log('📦 Payload:', payload);

    const res = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('🌐 Status:', res.status);

    if (!res.ok) {
      const errorMsg = await parseError(res);
      throw new Error(errorMsg);
    }

    const data = await res.json();

    console.log('📥 RAW RESPONSE:', data);

    // ─────────────────────────────────────────────
    // 🔍 VALIDACIÓN FUERTE
    // ─────────────────────────────────────────────
    if (!data || typeof data !== 'object') {
      throw new Error('Respuesta vacía o inválida del backend');
    }

    if (!data.comparacion) {
      throw new Error('El backend no devolvió comparación de modelos');
    }

    // 🔥 FALLBACKS INTELIGENTES (evitan romper UI)
    data.modelo_seleccionado = data.modelo_seleccionado ?? "Desconocido"
    data.r_squared = data.r_squared ?? null

    data.comparacion.empirico = data.comparacion.empirico ?? {}
    data.comparacion.biofisico = data.comparacion.biofisico ?? {}

    // ─────────────────────────────────────────────
    // 🧠 DEBUG CLARO
    // ─────────────────────────────────────────────
    console.log('📈 Resultado recibido:');
    console.log('→ Modelo:', data.modelo_seleccionado);
    console.log('→ R2 Empírico:', data.r2_empirico);
    console.log('→ R2 Biofísico:', data.r2_biofisico);

    return data;

  } catch (e) {
    console.error(`❌ analyzeData: ${e.message}`);

    throw new Error(
      e.message ||
      'No se pudo conectar con el backend o el análisis falló'
    );
  }
}

export async function postResults({ file, concentraciones, intensidades, brightnessThreshold = 100, heatmapThreshold = 0.5 }) {
  if (!file) {
    throw new Error('No se ha seleccionado ninguna imagen para enviar.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('brightness_threshold', String(brightnessThreshold));
  formData.append('heatmap_threshold', String(heatmapThreshold));

  if (Array.isArray(concentraciones) && Array.isArray(intensidades) && concentraciones.length === intensidades.length) {
    formData.append('calibracion_concentraciones', JSON.stringify(concentraciones));
    formData.append('calibracion_intensidades', JSON.stringify(intensidades));
  }

  try {
    const res = await fetch(`${BASE_URL}/api/process-image`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorMsg = await parseError(res);
      throw new Error(errorMsg);
    }

    const data = await res.json();
    if (!data || typeof data !== 'object') {
      throw new Error('Respuesta inválida del backend en /results.');
    }

    return data;
  } catch (e) {
    console.error(`❌ postResults: ${e.message}`);
    throw new Error(e.message || 'No se pudo ejecutar /results.');
  }
}

function _getFilenameFromContentDisposition(header) {
  if (!header) return null
  const match = header.match(/filename\*=UTF-8''(.+)$|filename="?([^";]+)"?/) 
  return match ? decodeURIComponent(match[1] || match[2]) : null
}

function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export async function generateReport({
  file,
  sampleName,
  analysisName,
  modelName,
  concentrationLabel,
  concentraciones,
  intensidades,
  brightnessThreshold = 100,
  heatmapThreshold = 0.5,
}) {
  if (!file) {
    throw new Error('No se ha seleccionado ninguna imagen para generar el reporte.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('brightness_threshold', String(brightnessThreshold));
  formData.append('heatmap_threshold', String(heatmapThreshold));
  if (sampleName) formData.append('sample_name', sampleName);
  if (analysisName) formData.append('analysis_name', analysisName);
  if (modelName) formData.append('model_name', modelName);
  if (concentrationLabel) formData.append('concentration_label', concentrationLabel);
  if (Array.isArray(concentraciones) && Array.isArray(intensidades) && concentraciones.length === intensidades.length) {
    formData.append('calibracion_concentraciones', JSON.stringify(concentraciones));
    formData.append('calibracion_intensidades', JSON.stringify(intensidades));
  }

  try {
    const res = await fetch(`${BASE_URL}/api/generate-report`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorMsg = await parseError(res);
      throw new Error(errorMsg);
    }

    const blob = await res.blob();
    const filename = _getFilenameFromContentDisposition(res.headers.get('content-disposition')) || 'reporte_fluorescencia.pdf';
    _downloadBlob(blob, filename);
    return filename;
  } catch (e) {
    console.error(`❌ generateReport: ${e.message}`);
    throw new Error(e.message || 'No se pudo generar el reporte PDF.');
  }
}

// ─────────────────────────────────────────────────────────────
// ROI & ARTIFACTS
// ─────────────────────────────────────────────────────────────
export async function detectROIs(file, { threshold = null, min_area = 50 } = {}) {
  if (!file) throw new Error('No se ha proporcionado archivo para detectar ROIs.')
  try {
    const fd = new FormData()
    fd.append('file', file)
    if (threshold !== null) fd.append('threshold', String(threshold))
    fd.append('min_area', String(min_area))

    const qs = ''
    const res = await fetch(`${BASE_URL}/api/detect-rois${qs}`, { method: 'POST', body: fd })
    if (!res.ok) {
      const err = await parseError(res)
      throw new Error(err)
    }
    return await res.json()
  } catch (e) {
    console.error('❌ detectROIs:', e.message)
    throw new Error(e.message || 'Error en detectROIs')
  }
}

export async function detectArtifacts(file) {
  if (!file) throw new Error('No se ha proporcionado archivo para detectar artefactos.')
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${BASE_URL}/api/artifacts`, { method: 'POST', body: fd })
    if (!res.ok) {
      const err = await parseError(res)
      throw new Error(err)
    }
    return await res.json()
  } catch (e) {
    console.error('❌ detectArtifacts:', e.message)
    throw new Error(e.message || 'Error en detectArtifacts')
  }
}
