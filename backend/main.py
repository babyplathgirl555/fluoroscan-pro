"""
main.py — FluoroScan Pro · Backend FastAPI
Análisis de fluorescencia biomédica
"""
 
import os
import shutil
import logging
from contextlib import asynccontextmanager
 
import numpy as np
from scipy.optimize import curve_fit
from scipy.interpolate import UnivariateSpline
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
 
# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
 
# ── Tus módulos existentes ────────────────────────────────────────────────────
# FIX #1: Imports al nivel de módulo con manejo de error explícito.
# Antes estaban bien aquí, pero si fallaban el servidor arrancaba sin avisar.
try:
    from procesamiento import analizar_imagen
    from analisis import analizar_datos
    # módulos añadidos recientemente
    try:
        from roi import detect_rois, extract_roi_features
        from artifacts import detect_artifacts
    except Exception as e:
        logger.warning(f"No se pudieron importar módulos ROI/artifacts: {e}")
except ImportError as e:
    logger.critical(
        f"No se pudo importar módulo requerido: {e}. "
        "Verifica que procesamiento.py y analisis.py estén en el mismo directorio "
        "y que todas sus dependencias estén instaladas."
    )
    raise SystemExit(1)  # Falla rápido y explícito al arrancar
 
 
# ── Configuración ─────────────────────────────────────────────────────────────
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
 
FORMATOS_VALIDOS = (".jpg", ".jpeg", ".png")
MAX_FILE_SIZE_MB = 20
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
 
 
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("FluoroScan Pro API iniciando...")
    yield
    logger.info("FluoroScan Pro API detenida.")
 
 
app = FastAPI(
    title="FluoroScan Pro API",
    description="Backend de análisis de fluorescencia biomédica",
    version="3.1.0",
    lifespan=lifespan,
)
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # FIX #5: CORS específico
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
 
 
# ── Modelos de datos ──────────────────────────────────────────────────────────
class AnalysisRequest(BaseModel):
    concentraciones: list[float]
    intensidades:    list[float]
    imagenes:        list[str] = []
 
    # FIX #6: Validación de datos en el modelo, no solo en el endpoint
    @field_validator("concentraciones", "intensidades")
    @classmethod
    def no_vacio(cls, v: list[float]) -> list[float]:
        if not v:
            raise ValueError("La lista no puede estar vacía.")
        return v
 
    @field_validator("concentraciones", "intensidades")
    @classmethod
    def sin_negativos(cls, v: list[float]) -> list[float]:
        if any(x < 0 for x in v):
            raise ValueError("Los valores no pueden ser negativos.")
        return v
 
 
# ── Endpoints ─────────────────────────────────────────────────────────────────
 
@app.get("/health")
def health_check():
    """Verifica que el backend esté activo."""
    return {"status": "ok", "version": "3.1.0"}
 
 
@app.post("/api/process-image")
async def process_image(file: UploadFile = File(...)):
    """
    Recibe una imagen y devuelve la intensidad de fluorescencia.
 
    FIX #2: Ahora lanza HTTPException en caso de error (consistente con /api/analyze)
    para que el frontend pueda detectar fallos correctamente.
    FIX #4: Valida tamaño real del archivo, no solo la extensión.
    """
    # Validar extensión
    if not file.filename.lower().endswith(FORMATOS_VALIDOS):
        raise HTTPException(
            status_code=422,
            detail=f"Formato no soportado. Usa JPG o PNG. Recibido: '{file.filename}'"
        )
 
    # FIX #4: Leer contenido y validar tamaño real antes de guardar
    contenido = await file.read()
    if len(contenido) == 0:
        raise HTTPException(status_code=422, detail="El archivo está vacío.")
    if len(contenido) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Archivo demasiado grande. Máximo {MAX_FILE_SIZE_MB} MB."
        )
 
    tmp_path = os.path.join(UPLOAD_DIR, f"tmp_{file.filename}")
    try:
        with open(tmp_path, "wb") as buffer:
            buffer.write(contenido)
 
        resultado = analizar_imagen(tmp_path)
 
        if isinstance(resultado, (tuple, list)):
            intensidad = float(resultado[0])
        else:
            intensidad = float(resultado)
 
        logger.info(f"Imagen procesada: {file.filename} → intensidad={intensidad:.4f}")
        return {
            "filename":   file.filename,
            "intensidad": round(intensidad, 4),
            "ok":         True,
        }
 
    except HTTPException:
        raise
    except ValueError as e:
        # Error de conversión de tipo: la función retornó algo inesperado
        logger.error(f"Error de valor al procesar {file.filename}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"analizar_imagen retornó un valor inesperado: {e}"
        )
    except Exception as e:
        logger.error(f"Error al procesar {file.filename}: {e}")
        # FIX #2: Antes retornaba 200 con ok=False, ahora lanza error real
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la imagen: {str(e)}"
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/detect-rois")
async def api_detect_rois(file: UploadFile = File(...), threshold: float | None = None, min_area: int = 50):
    """Detecta ROIs en la imagen y devuelve bbox, área, centroides y mean_green_excess."""
    # Validación básica igual que /api/process-image
    if not file.filename.lower().endswith(FORMATOS_VALIDOS):
        raise HTTPException(status_code=422, detail="Formato no soportado")
    contenido = await file.read()
    if len(contenido) == 0:
        raise HTTPException(status_code=422, detail="Archivo vacío")
    if len(contenido) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande")

    tmp_path = os.path.join(UPLOAD_DIR, f"roi_{file.filename}")
    try:
        with open(tmp_path, "wb") as f:
            f.write(contenido)
        import cv2
        img = cv2.imread(tmp_path)
        if img is None:
            raise HTTPException(status_code=400, detail="No se pudo leer la imagen con OpenCV")

        rois = detect_rois(img, threshold=threshold, min_area=min_area)
        # no devolvemos máscaras binarias completas por motivos de tamaño
        simplified = [
            {
                "bbox": r["bbox"],
                "area": r["area"],
                "centroid": r["centroid"],
                "mean_green_excess": round(float(r.get("mean_green_excess", 0.0)), 6),
            }
            for r in rois
        ]
        return {"filename": file.filename, "n_rois": len(simplified), "rois": simplified}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/api/artifacts")
async def api_detect_artifacts(file: UploadFile = File(...)):
    """Detecta artefactos experimentales en la imagen (saturación, desenfoque, ruido)."""
    if not file.filename.lower().endswith(FORMATOS_VALIDOS):
        raise HTTPException(status_code=422, detail="Formato no soportado")
    contenido = await file.read()
    if len(contenido) == 0:
        raise HTTPException(status_code=422, detail="Archivo vacío")
    if len(contenido) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande")

    tmp_path = os.path.join(UPLOAD_DIR, f"art_{file.filename}")
    try:
        with open(tmp_path, "wb") as f:
            f.write(contenido)
        import cv2
        img = cv2.imread(tmp_path)
        if img is None:
            raise HTTPException(status_code=400, detail="No se pudo leer la imagen con OpenCV")
        art = detect_artifacts(img)
        return {"filename": file.filename, "artifacts": art}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
 
 
@app.post("/api/analyze")
def analyze(req: AnalysisRequest):
    """
    Ajusta el modelo de fluorescencia y devuelve la curva + parámetros.
    """
    # FIX: Validaciones de negocio claras y separadas
    if len(req.concentraciones) != len(req.intensidades):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Las listas deben tener la misma longitud. "
                f"concentraciones={len(req.concentraciones)}, "
                f"intensidades={len(req.intensidades)}"
            )
        )
    if len(req.concentraciones) < 3:
        raise HTTPException(
            status_code=422,
            detail=f"Se necesitan al menos 3 puntos. Recibidos: {len(req.concentraciones)}"
        )
 
    try:
        resultado = analizar_datos(req.concentraciones, req.intensidades)
        logger.info(f"Análisis completado para {len(req.concentraciones)} puntos.")
    except Exception as e:
        logger.error(f"Error en analizar_datos: {e}")
        raise HTTPException(status_code=500, detail=f"Error en el análisis: {str(e)}")
 
    # FIX: Manejo explícito de los formatos de retorno posibles
    if isinstance(resultado, dict):
        return resultado
 
    if isinstance(resultado, (tuple, list)) and len(resultado) >= 2:
        conc_opt, int_max = float(resultado[0]), float(resultado[1])
        return _construir_curva(
            req.concentraciones,
            req.intensidades,
            conc_opt,
            int_max,
        )
 
    # Fallback documentado
    logger.warning(f"analizar_datos retornó formato inesperado: {type(resultado)}")
    return {"resultado_raw": str(resultado), "advertencia": "Formato de retorno inesperado"}
 
 
# ── Función auxiliar: construye la curva para el gráfico ─────────────────────
def _construir_curva(
    concentraciones: list[float],
    intensidades: list[float],
    conc_opt: float,
    int_max: float,
) -> dict:
    """
    Genera la curva suavizada para mostrar en la gráfica del frontend.
 
    FIX #3: Imports de numpy/scipy movidos al nivel de módulo (arriba del archivo).
    """
    x = np.array(concentraciones, dtype=float)
    y = np.array(intensidades,    dtype=float)
    idx = np.argsort(x)
    x, y = x[idx], y[idx]
 
    def modelo_exponencial(x_val, a, b, c):
        return a * np.exp(-b * x_val) + c
 
    xs     = np.linspace(x.min(), x.max(), 200).tolist()
    ajuste = False
    params = None
    perr   = None
    ys     = []
 
    # Intento 1: ajuste exponencial
    try:
        a0   = float(np.max(y) - np.min(y))
        xr   = float(x[-1] - x[0])
        b0   = 1.0 / xr if xr > 0 else 1.0
        c0   = float(np.min(y))
 
        popt, pcov = curve_fit(
            modelo_exponencial, x, y,
            p0=[max(a0, 1e-9), max(b0, 1e-9), max(c0, 0.0)],
            bounds=(0, np.inf),
            maxfev=50_000,
            method="trf",
        )
        perr_arr = np.sqrt(np.diag(pcov))
 
        if np.all(np.isfinite(perr_arr)) and np.all(perr_arr < 1e6):
            ys     = modelo_exponencial(np.array(xs), *popt).tolist()
            params = [round(float(p), 6) for p in popt]
            perr   = [round(float(p), 6) for p in perr_arr]
            ajuste = True
            logger.info("Ajuste exponencial exitoso.")
 
    except Exception as e:
        logger.warning(f"Ajuste exponencial falló ({e}), intentando spline...")
 
    # Intento 2: spline suavizado
    if not ajuste:
        k = min(3, len(x) - 1)
        try:
            spl = UnivariateSpline(x, y, k=k, s=0)
            ys  = np.clip(spl(np.array(xs)), 0, None).tolist()
            logger.info("Interpolación con spline exitosa.")
        except Exception as e:
            logger.warning(f"Spline falló ({e}), usando interpolación lineal.")
            # Intento 3: interpolación lineal como último recurso
            ys = np.interp(xs, x.tolist(), y.tolist()).tolist()
 
    return {
        "concentracion_optima": round(conc_opt, 6),
        "intensidad_maxima":    round(int_max,  6),
        "curva": {
            "x": [round(v, 4) for v in xs],
            "y": [round(v, 4) for v in ys],
        },
        "puntos": {
            "x": [round(v, 4) for v in x.tolist()],
            "y": [round(v, 4) for v in y.tolist()],
        },
        "ajuste_exitoso": ajuste,
        "parametros":     params,
        "incertidumbres": perr,
    }
 
 
# ── Punto de entrada ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
