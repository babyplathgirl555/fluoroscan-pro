import io
import os
import time
import base64
import datetime
from typing import Any

import cv2
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from analisis import analizar_datos, calculate_beer_lambert_metrics
from estadisticas import analyze_image_statistics, normalize_channel
from interpretacion import interpret_results
from mascara import build_results_images

PDF_DIR = "temp_reports"
os.makedirs(PDF_DIR, exist_ok=True)

# Register common system fonts (prefer embedding when available)
FONT_SANS = "Helvetica"
FONT_MONO = "Courier"
_font_candidates = {
    "FSans": [
        r"C:\\Windows\\Fonts\\arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
    "FMono": [
        r"C:\\Windows\\Fonts\\consola.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ],
}
for name, paths in _font_candidates.items():
    for p in paths:
        try:
            if os.path.exists(p):
                pdfmetrics.registerFont(TTFont(name, p))
                if name == "FSans":
                    FONT_SANS = name
                else:
                    FONT_MONO = name
                break
        except Exception:
            continue


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _safe_text(value: Any, default: str = "N/A") -> str:
    if value is None:
        return default
    if isinstance(value, float):
        return f"{value:.4f}"
    if isinstance(value, (list, dict)):
        return str(value)
    return str(value)


def _figure_to_bytes(fig: plt.Figure) -> io.BytesIO:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def _plot_histogram(image: np.ndarray) -> io.BytesIO:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    values = gray.flatten().astype(np.float32)
    fig, ax = plt.subplots(figsize=(5, 3), dpi=100)
    ax.hist(values, bins=24, color="#c94d7d", edgecolor="#ffffff", alpha=0.85)
    ax.set_title("Histograma de intensidad", fontsize=10, fontweight="bold")
    ax.set_xlabel("Valor de intensidad")
    ax.set_ylabel("Frecuencia")
    ax.grid(axis="y", alpha=0.25)
    return _figure_to_bytes(fig)


def _plot_profile(image: np.ndarray) -> io.BytesIO:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    row = gray[gray.shape[0] // 2].astype(np.float32)
    x = np.arange(len(row))
    fig, ax = plt.subplots(figsize=(5, 3), dpi=100)
    ax.plot(x, row, color="#007a87", linewidth=1.6)
    ax.set_title("Perfil central de intensidad", fontsize=10, fontweight="bold")
    ax.set_xlabel("Coordenada X")
    ax.set_ylabel("Intensidad gris")
    ax.grid(alpha=0.25)
    return _figure_to_bytes(fig)


def _export_csv(csv_path: str, stats: dict, model_metrics: dict, concentrations: list | None, intensities: list | None):
    rows = []
    # intensity stats
    intensity = stats.get('intensity_stats', {})
    for k, v in intensity.items():
        rows.append({'section': 'intensity', 'metric': k, 'value': v})

    spatial = stats.get('spatial_stats', {})
    for k, v in spatial.items():
        rows.append({'section': 'spatial', 'metric': k, 'value': v})

    # model metrics
    for k, v in model_metrics.items():
        rows.append({'section': 'model', 'metric': k, 'value': v})

    # concentrations / intensities
    if concentrations and intensities and len(concentrations) == len(intensities):
        for c, i in zip(concentrations, intensities):
            rows.append({'section': 'calibration', 'metric': c, 'value': i})

    df = pd.DataFrame(rows)
    df.to_csv(csv_path, index=False)


def _export_excel(xlsx_path: str, stats: dict, model_metrics: dict, concentrations: list | None, intensities: list | None):
    with pd.ExcelWriter(xlsx_path, engine='openpyxl') as writer:
        intensity = stats.get('intensity_stats', {})
        pd.DataFrame(list(intensity.items()), columns=['metric', 'value']).to_excel(writer, sheet_name='intensity', index=False)

        spatial = stats.get('spatial_stats', {})
        pd.DataFrame(list(spatial.items()), columns=['metric', 'value']).to_excel(writer, sheet_name='spatial', index=False)

        pd.DataFrame(list(model_metrics.items()), columns=['metric', 'value']).to_excel(writer, sheet_name='model', index=False)

        if concentrations and intensities and len(concentrations) == len(intensities):
            dfc = pd.DataFrame({'concentration': concentrations, 'intensity': intensities})
            dfc.to_excel(writer, sheet_name='calibration', index=False)


def _plot_beer_curve(concentrations: list[float], intensities: list[float], curve_x: list[float], curve_y: list[float], equation: str) -> io.BytesIO:
    fig, ax = plt.subplots(figsize=(5, 3), dpi=100)
    ax.scatter(concentrations, intensities, color="#3d6fb8", label="Datos experimentales", zorder=5)
    ax.plot(curve_x, curve_y, color="#d9486f", linewidth=2, label="Curva Beer-Lambert")
    ax.set_title("Curva Beer-Lambert", fontsize=10, fontweight="bold")
    ax.set_xlabel("Concentración")
    ax.set_ylabel("Intensidad")
    ax.grid(alpha=0.25)
    ax.legend(fontsize=8)
    ax.text(0.02, 0.88, "Ecuación disponible en el informe", transform=ax.transAxes, fontsize=7, va="top", bbox=dict(boxstyle="round,pad=0.2", facecolor="#ffffff", alpha=0.8, edgecolor="none"))
    return _figure_to_bytes(fig)


def _paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text.replace("\n", "<br/>"), style)


def build_pdf_report(
    original_image_path: str,
    sample_name: str | None = None,
    analysis_name: str | None = None,
    model_name: str | None = None,
    concentration_label: str | None = None,
    brightness_threshold: int = 100,
    heatmap_threshold: float = 0.5,
    concentrations: list[float] | None = None,
    intensities: list[float] | None = None,
) -> str:
    _ensure_dir(PDF_DIR)

    pdf_name = f"reporte_fluorescencia_{int(time.time())}.pdf"
    pdf_path = os.path.join(PDF_DIR, pdf_name)

    original_image = cv2.imread(original_image_path)
    if original_image is None:
        raise ValueError("No se pudo cargar la imagen original para generar el reporte.")

    visuals = build_results_images(
        original_image,
        brightness_threshold=brightness_threshold,
        output_dir="result_images",
        prefix=os.path.splitext(os.path.basename(original_image_path))[0],
    )

    stats = analyze_image_statistics(
        original_image,
        brightness_threshold=brightness_threshold,
        heatmap_threshold=heatmap_threshold,
    )

    has_calibration = bool(concentrations and intensities and len(concentrations) == len(intensities) and len(concentrations) >= 2)
    model_metrics = {
        "r2": 0.0,
        "rmse": 0.0,
        "mae": 0.0,
        "slope": 0.0,
        "equation": "No se proporcionaron datos de calibración para Beer-Lambert.",
        "selected_model": "No disponible",
    }
    curve_data = None

    if has_calibration:
        try:
            analysis_result = analizar_datos(concentrations, intensities)
            model_metrics = calculate_beer_lambert_metrics(concentrations, intensities)
            model_metrics["selected_model"] = analysis_result.get("modelo_seleccionado", "Beer-Lambert")
            curve_data = {
                "x": analysis_result.get("curva_x", []),
                "y": analysis_result.get("curva", {}).get("y", []),
                "equation": model_metrics.get("equation", ""),
            }
        except Exception:
            pass

    interpretation_input = {
        "intensity_stats": stats["intensity_stats"],
        "spatial_stats": {
            "fluorescent_area": stats["spatial_stats"].get("area_pixels", 0),
            "fluorescent_percentage": stats["spatial_stats"].get("percent", 0.0),
            "centroid": stats["spatial_stats"].get("centroid"),
            "uniformity": stats["spatial_stats"].get("uniformity", 0.0),
        },
        "model_metrics": model_metrics,
    }
    interpretation = interpret_results(interpretation_input)

    styles = getSampleStyleSheet()
    # Centralized styles (use embedded fonts when available)
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontSize=24,
        alignment=TA_CENTER,
        spaceAfter=18,
        textColor=colors.HexColor("#1f2937"),
        fontName=FONT_SANS,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Heading2"],
        fontSize=12,
        alignment=TA_CENTER,
        leading=14,
        textColor=colors.HexColor("#4b5563"),
        fontName=FONT_SANS,
    )
    heading_style = ParagraphStyle(
        "Heading",
        parent=styles["Heading2"],
        fontSize=14,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#111827"),
        spaceAfter=8,
        fontName=FONT_SANS,
    )
    # Make headings register in TOC
    heading_style.outlineLevel = 0
    body_style = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#111827"),
        fontName=FONT_SANS,
    )
    small_style = ParagraphStyle(
        "Small",
        parent=styles["BodyText"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4b5563"),
        fontName=FONT_SANS,
    )

    story = []
    story.append(_paragraph("<b>FluoroScan Pro — Informe Técnico de Fluorescencia</b>", title_style))
    story.append(_paragraph(f"<i>{analysis_name or 'Análisis técnico de fluorescencia'}</i>", subtitle_style))
    story.append(Spacer(1, 12))
    story.append(_paragraph(f"Fecha: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", small_style))
    story.append(_paragraph(f"Muestra: {sample_name or 'No especificada'}", small_style))
    story.append(_paragraph(f"Modelo: {model_name or 'FluoroScan Pro' }", small_style))
    if concentration_label:
        story.append(_paragraph(f"Concentración: {concentration_label}", small_style))
    story.append(Spacer(1, 18))

    # Table of Contents
    toc = TableOfContents()
    toc.levelStyles = [ParagraphStyle(name='TOCLevel0', fontSize=11, leftIndent=20, firstLineIndent=-20, spaceBefore=6, leading=12)]
    story.append(_paragraph("<b>Tabla de contenidos</b>", heading_style))
    story.append(toc)
    story.append(PageBreak())
    story.append(_paragraph("Resumen técnico", heading_style))
    story.append(_paragraph(
        "Este reporte presenta un análisis cuantitativo de la fluorescencia detectada, "
        "incluyendo imágenes procesadas, métricas de intensidad, análisis espacial, "
        "y una evaluación del ajuste Beer-Lambert cuando se dispone de calibración.",
        body_style,
    ))
    story.append(PageBreak())

    story.append(_paragraph("Información general", heading_style))
    info_table = Table([
        ["Parámetro", "Valor"],
        ["Nombre de la muestra", _safe_text(sample_name)],
        ["Nombre del análisis", _safe_text(analysis_name)],
        ["Fecha / hora", datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
        ["Modelo utilizado", _safe_text(model_name)],
        ["Calibración disponible", "Sí" if has_calibration else "No"],
        ["Concentración", _safe_text(concentration_label)],
        ["Umbral de brillo", str(brightness_threshold)],
        ["Umbral de heatmap", f"{heatmap_threshold:.2f}"],
    ], colWidths=[5.5 * cm, 10 * cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 18))

    story.append(_paragraph("Imágenes", heading_style))
    image_table = Table([
        [
            RLImage(visuals["original_path"], width=5.5 * cm, height=5.5 * cm),
            RLImage(visuals["heatmap_path"], width=5.5 * cm, height=5.5 * cm),
            RLImage(visuals["overlay_path"], width=5.5 * cm, height=5.5 * cm),
        ],
        ["Original", "Heatmap", "Overlay"],
    ], colWidths=[5.5 * cm, 5.5 * cm, 5.5 * cm])
    image_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (1, 0), (-1, -1), 6),
        ("FONTNAME", (0, 1), (-1, 1), FONT_SANS),
        ("FONTSIZE", (0, 1), (-1, 1), 9),
    ]))
    story.append(image_table)
    story.append(PageBreak())

    story.append(_paragraph("Estadísticas cuantitativas", heading_style))
    intensity = stats["intensity_stats"]
    spatial = stats["spatial_stats"]
    metrics_data = [
        ["Métrica", "Valor"],
        ["Intensidad media", f"{intensity.get('mean', 0.0):.4f}"],
        ["Mediana", f"{intensity.get('median', 0.0):.4f}"],
        ["Máximo", f"{intensity.get('max', 0.0):.4f}"],
        ["Mínimo", f"{intensity.get('min', 0.0):.4f}"],
        ["Desviación estándar", f"{intensity.get('std', 0.0):.4f}"],
        ["Varianza", f"{intensity.get('variance', 0.0):.4f}"],
        ["Percentil 95", f"{intensity.get('percentile_95', 0.0):.4f}"],
        ["Área fluorescente", f"{spatial.get('area_pixels', 0)} px"],
        ["Porcentaje fluorescente", f"{spatial.get('percent', 0.0):.2f}%"],
        ["Uniformidad", f"{spatial.get('uniformity', 0.0):.4f}"],
        ["Centroide X", f"{spatial.get('centroid', {}).get('x', 0.0):.2f}"],
        ["Centroide Y", f"{spatial.get('centroid', {}).get('y', 0.0):.2f}"],
    ]
    metrics_table = Table(metrics_data, colWidths=[6 * cm, 9 * cm])
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2ff")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("FONTNAME", (0, 0), (-1, 0), FONT_SANS),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (1, 1), (1, -1), FONT_MONO),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 18))

    story.append(_paragraph("Métricas Beer-Lambert", heading_style))
    if has_calibration:
        beer_table = Table([
            ["Parámetro", "Valor"],
            ["R²", f"{model_metrics.get('r2', 0.0):.4f}"],
            ["RMSE", f"{model_metrics.get('rmse', 0.0):.4f}"],
            ["MAE", f"{model_metrics.get('mae', 0.0):.4f}"],
            ["Pendiente", f"{model_metrics.get('slope', 0.0):.4f}"],
            ["Ecuación", _safe_text(model_metrics.get('equation'))],
        ], colWidths=[6 * cm, 9 * cm])
    else:
        beer_table = Table([
            ["Parámetro", "Valor"],
            ["Calibración", "No disponible"],
            ["Detalles", "Se requieren concentraciones e intensidades para Beer-Lambert."],
        ], colWidths=[6 * cm, 9 * cm])
    beer_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("FONTNAME", (0, 0), (-1, 0), FONT_SANS),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (1, 1), (1, -1), FONT_MONO),
    ]))
    story.append(beer_table)
    story.append(PageBreak())

    story.append(_paragraph("Gráficas", heading_style))
    chart_items = []
    chart_items.append(RLImage(_plot_histogram(original_image), width=16 * cm, height=8 * cm))
    chart_items.append(Spacer(1, 12))
    chart_items.append(RLImage(_plot_profile(original_image), width=16 * cm, height=8 * cm))
    if has_calibration and curve_data and curve_data["x"] and curve_data["y"]:
        beer_curve = _plot_beer_curve(concentrations, intensities, curve_data["x"], curve_data["y"], str(model_metrics.get("equation", "")))
        chart_items.append(Spacer(1, 12))
        chart_items.append(RLImage(beer_curve, width=16 * cm, height=8 * cm))
        chart_items.append(Spacer(1, 12))
        story.extend(chart_items)
    else:
        story.extend(chart_items)
    story.append(Spacer(1, 18))

    story.append(_paragraph("Interpretación automática", heading_style))
    conclusion_lines = []
    if isinstance(interpretation, dict):
        if interpretation.get("general_conclusion"):
            conclusion_lines.append(interpretation["general_conclusion"])
        for block in (
            interpretation.get("intensity_analysis") or [],
            interpretation.get("spatial_analysis") or [],
            interpretation.get("model_analysis") or [],
        ):
            if isinstance(block, list):
                conclusion_lines.extend([str(item) for item in block])
    elif isinstance(interpretation, list):
        conclusion_lines.extend([str(item) for item in interpretation])

    interpretation_text = "".join([f"• {line}<br/>" for line in conclusion_lines])
    if not interpretation_text:
        interpretation_text = _safe_text(interpretation)
    story.append(_paragraph(interpretation_text, body_style))
    story.append(Spacer(1, 12))
    story.append(_paragraph("Conclusión final", heading_style))
    conclusion = (
        interpretation.get("general_conclusion")
        if isinstance(interpretation, dict) and interpretation.get("general_conclusion")
        else "El análisis se realizó correctamente y se cuenta con las métricas cuantitativas mostradas."
    )
    story.append(_paragraph(conclusion, body_style))

    # Export CSV and Excel alongside the PDF for numerical review
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    csv_path = os.path.join(PDF_DIR, f"{base_name}.csv")
    xlsx_path = os.path.join(PDF_DIR, f"{base_name}.xlsx")
    try:
        _export_csv(csv_path, stats, model_metrics, concentrations, intensities)
    except Exception:
        # non-fatal
        pass
    try:
        _export_excel(xlsx_path, stats, model_metrics, concentrations, intensities)
    except Exception:
        pass

    doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=2 * cm, leftMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm)

    # Header/footer and metadata
    def _draw_header_footer(canvas, doc):
        canvas.saveState()
        w, h = letter
        # Header
        canvas.setFont(FONT_SANS, 9)
        header_text = f"FluoroScan Pro — {analysis_name or ''}"
        canvas.drawString(doc.leftMargin, h - doc.topMargin + 10, header_text)
        # Footer / page number
        canvas.setFont(FONT_MONO, 9)
        page_text = f"Página {canvas.getPageNumber()}"
        canvas.drawRightString(w - doc.rightMargin, doc.bottomMargin - 10, page_text)
        canvas.restoreState()

    def _on_first_page(canvas, doc):
        # metadata
        canvas.setAuthor("FluoroScan Pro")
        canvas.setTitle("Informe Técnico de Fluorescencia")
        canvas.setSubject(analysis_name or "Reporte de fluorescencia")
        _draw_header_footer(canvas, doc)

    def _on_later_pages(canvas, doc):
        _draw_header_footer(canvas, doc)

    # multi-pass build so TOC entries include page numbers
    try:
        doc.multiBuild(story, onFirstPage=_on_first_page, onLaterPages=_on_later_pages)
    except AttributeError:
        # fallback if multiBuild not present
        doc.build(story, onFirstPage=_on_first_page, onLaterPages=_on_later_pages)

    return pdf_path
