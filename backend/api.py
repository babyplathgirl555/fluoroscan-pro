"""
api.py — FluoroScan Pro · Backend FastAPI v3.1
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import shutil, os, logging, json
import cv2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FluoroscenceAPI")

try:
    from procesamiento import analizar_imagen
    from analisis import analizar_datos, calculate_beer_lambert_metrics
    from estadisticas import analyze_image_statistics
    from mascara import build_results_images
    from interpretacion import interpret_results
    from reportes import build_pdf_report
    logger.info("✅ Módulos cargados correctamente.")
except ImportError as e:
    logger.error(f"❌ Error: {e}")

app = FastAPI(title="FluoroScan Pro API", version="3.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_images"
RESULTS_DIR = "result_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)
PDF_DIR = "temp_reports"
os.makedirs(PDF_DIR, exist_ok=True)

# ── Modelos ───────────────────────────────────────────────────────────────────
class AnalysisRequest(BaseModel):
    concentraciones: list[float]
    intensidades:    list[float]
    imagenes:        list[str]

# ── Historial en memoria (se pierde al reiniciar — ver nota abajo) ────────────
_historial: list[dict] = []

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "3.1.0"}


@app.post("/process-image")
@app.post("/api/process-image")
async def process_image_endpoint(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        resultado = analizar_imagen(file_path)
        intensidad, area, snr, contraste = resultado[0], resultado[1], resultado[2], resultado[3]

        # Imágenes base64 (índices 4-9 si existen)
        imagenes = {}
        if len(resultado) >= 9:
            imagenes = {
                "original":    resultado[5],
                "mascara":     resultado[4],
                "overlay":     resultado[6],
                "comparacion": resultado[7],
                "heatmap":     resultado[8],
            }

        return {
            "filename":   file.filename,
            "intensidad": round(float(intensidad), 4),
            "area":       int(area),
            "snr":        round(float(snr), 4),
            "contraste":  round(float(contraste), 4),
            "ok":         True,
            "imagenes":   imagenes,
        }
    except Exception as e:
        logger.error(f"Error procesando {file.filename}: {e}")
        return {"filename": file.filename, "intensidad": 0.0,
                "ok": False, "error": str(e)}
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.post("/results")
@app.post("/api/results")
async def results_endpoint(
    file: UploadFile = File(...),
    brightness_threshold: int = Form(100),
    heatmap_threshold: float = Form(0.5),
    calibracion_concentraciones: str | None = Form(None),
    calibracion_intensidades: str | None = Form(None),
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        image = cv2.imread(file_path)
        if image is None:
            raise HTTPException(status_code=400, detail="Archivo inválido o no es una imagen compatible")

        visuals = build_results_images(
            image,
            brightness_threshold=brightness_threshold,
            output_dir=RESULTS_DIR,
            prefix=os.path.splitext(os.path.basename(file.filename))[0],
        )

        stats = analyze_image_statistics(
            image,
            brightness_threshold=brightness_threshold,
            heatmap_threshold=heatmap_threshold,
        )

        def parse_optional_list(raw_value, field_name):
            if raw_value is None:
                return None
            try:
                payload = json.loads(raw_value)
            except json.JSONDecodeError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Formato inválido para {field_name}. Debe ser JSON válido.",
                ) from exc
            if not isinstance(payload, list):
                raise HTTPException(
                    status_code=400,
                    detail=f"{field_name} debe ser un arreglo JSON de números.",
                )
            try:
                return [float(x) for x in payload]
            except (TypeError, ValueError) as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"{field_name} contiene valores no numéricos.",
                ) from exc

        concentrations = parse_optional_list(calibracion_concentraciones, "concentraciones")
        intensities = parse_optional_list(calibracion_intensidades, "intensidades")

        if (concentrations is None) ^ (intensities is None):
            raise HTTPException(
                status_code=400,
                detail="Si se proporciona calibración, debe enviar concentraciones e intensidades juntas.",
            )

        model_metrics = {
            "r2": 0.0,
            "rmse": 0.0,
            "mae": 0.0,
            "slope": 0.0,
            "equation": "No se proporcionaron datos de calibración para Beer-Lambert.",
        }
        if concentrations is not None and intensities is not None:
            model_metrics = calculate_beer_lambert_metrics(concentrations, intensities)
            model_metrics["selected_model"] = "Beer-Lambert"

        intensity_stats = stats["intensity_stats"]
        spatial_raw = stats["spatial_stats"]
        centroid = spatial_raw.get("centroid") or {}

        # Preparar datos para interpretación
        interpretation_input = {
            "intensity_stats": intensity_stats,
            "spatial_stats": {
                "fluorescent_area": spatial_raw.get("area_pixels", 0),
                "fluorescent_percentage": spatial_raw.get("percent", 0.0),
                "centroid": centroid,
                "uniformity": spatial_raw.get("uniformity", 0.0),
            },
            "model_metrics": model_metrics,
        }

        # Generar interpretación científica automática
        interpretation = interpret_results(interpretation_input)

        return {
            "success": True,
            "model_metrics": model_metrics,
            "model_name": model_metrics.get("selected_model", "N/A"),
            "images": {
                "original": visuals["original_base64"],
                "heatmap": visuals["heatmap_base64"],
                "overlay": visuals["overlay_base64"],
            },
            "intensity_stats": {
                "mean": intensity_stats["mean"],
                "median": intensity_stats["median"],
                "max": intensity_stats["max"],
                "min": intensity_stats["min"],
                "std": intensity_stats["std"],
                "variance": intensity_stats["variance"],
                "p95": intensity_stats.get("percentile_95", 0.0),
            },
            "spatial_stats": {
                "fluorescent_area": spatial_raw.get("area_pixels", 0),
                "fluorescent_percentage": spatial_raw.get("percent", 0.0),
                "centroid_x": float(centroid.get("x", 0.0)),
                "centroid_y": float(centroid.get("y", 0.0)),
                "uniformity": spatial_raw.get("uniformity", 0.0),
            },
            "interpretation": interpretation,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en /results: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.post("/generate-report")
@app.post("/api/generate-report")
async def generate_report_endpoint(
    file: UploadFile = File(...),
    sample_name: str | None = Form(None),
    analysis_name: str | None = Form(None),
    model_name: str | None = Form(None),
    concentration_label: str | None = Form(None),
    brightness_threshold: int = Form(100),
    heatmap_threshold: float = Form(0.5),
    calibracion_concentraciones: str | None = Form(None),
    calibracion_intensidades: str | None = Form(None),
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        image = cv2.imread(file_path)
        if image is None:
            raise HTTPException(status_code=400, detail="Archivo inválido o no es una imagen compatible")

        def parse_optional_list(raw_value, field_name):
            if raw_value is None:
                return None
            try:
                payload = json.loads(raw_value)
            except json.JSONDecodeError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Formato inválido para {field_name}. Debe ser JSON válido.",
                ) from exc
            if not isinstance(payload, list):
                raise HTTPException(
                    status_code=400,
                    detail=f"{field_name} debe ser un arreglo JSON de números.",
                )
            try:
                return [float(x) for x in payload]
            except (TypeError, ValueError) as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"{field_name} contiene valores no numéricos.",
                ) from exc

        concentrations = parse_optional_list(calibracion_concentraciones, "concentraciones")
        intensities = parse_optional_list(calibracion_intensidades, "intensidades")

        if (concentrations is None) ^ (intensities is None):
            raise HTTPException(
                status_code=400,
                detail="Si se proporciona calibración, debe enviar concentraciones e intensidades juntas.",
            )

        pdf_path = build_pdf_report(
            original_image_path=file_path,
            sample_name=sample_name or os.path.splitext(file.filename)[0],
            analysis_name=analysis_name or "Análisis de fluorescencia",
            model_name=model_name or "FluoroScan Pro",
            concentration_label=concentration_label,
            brightness_threshold=brightness_threshold,
            heatmap_threshold=heatmap_threshold,
            concentrations=concentrations,
            intensities=intensities,
        )

        return FileResponse(pdf_path, media_type="application/pdf", filename=os.path.basename(pdf_path))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en /generate-report: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.post("/analyze")
@app.post("/api/analyze")
def analyze_endpoint(req: AnalysisRequest):
    try:
        # analizar_datos ahora devuelve un dict completo
        resultado = analizar_datos(req.concentraciones, req.intensidades)

        # Guardar en historial
        _historial.append({
            "concentraciones":     req.concentraciones,
            "intensidades":        req.intensidades,
            "concentracion_optima": resultado["concentracion_optima"],
            "intensidad_maxima":    resultado["intensidad_maxima"],
            "r_squared":            resultado["r_squared"],
            "ajuste_exitoso":       resultado["ajuste_exitoso"],
        })

        return resultado

    except Exception as e:
        logger.error(f"Error en análisis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history")
@app.get("/api/history")
def get_history():
    """Devuelve el historial de análisis de la sesión actual."""
    return {"historial": _historial, "total": len(_historial)}


@app.delete("/history")
@app.delete("/api/history")
def clear_history():
    """Limpia el historial."""
    _historial.clear()
    return {"ok": True, "mensaje": "Historial eliminado"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
