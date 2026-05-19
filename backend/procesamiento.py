# procesamiento.py — FluoroScan Pro
# Versión para backend: sin cv2.imshow() ni cv2.waitKey()
 
import cv2
import numpy as np
import base64
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import io
 
 
def analizar_imagen(ruta):
    """
    Analiza una imagen y extrae métricas de fluorescencia verde.
 
    Parámetros:
        ruta (str): Ruta de la imagen a analizar.
 
    Retorna:
        tuple: (intensidad, area, snr, contrast, mask_b64, original_b64, overlay_b64, comparacion_b64, heatmap_b64)
               Los últimos 5 son strings base64 para mostrar en el frontend.
    """
 
    # ── Carga y conversión ────────────────────────────────────────────────────
    img = cv2.imread(ruta)
 
    if img is None:
        raise FileNotFoundError(f"No se pudo cargar la imagen en: {ruta}")
 
    # Convertir al espacio HSV para segmentar el verde fluorescente
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
 
    # Segmentación del color verde (fluoresceína)
    lower_green = np.array([40, 100, 100])
    upper_green = np.array([80, 255, 255])
 
    # Máscara binaria
    mask = cv2.inRange(hsv, lower_green, upper_green)
 
    # Filtro adicional por brillo
    canal_v = hsv[:, :, 2]
    mask = cv2.bitwise_and(
        mask, mask,
        mask=(canal_v > 100).astype(np.uint8) * 255
    )
 
    # ── Métricas ──────────────────────────────────────────────────────────────
    if np.any(mask > 0):
        intensidad = float(np.mean(canal_v[mask > 0]))
    else:
        intensidad = 0.0
 
    area       = int(cv2.countNonZero(mask))
    signal     = intensidad
    background = canal_v[mask == 0]
    noise      = float(np.mean(background)) if background.size > 0 else 0.0
    snr        = signal / (noise + 1e-10)
    contrast   = (signal - noise) / (signal + noise + 1e-10)
 
    # ── Preparar imágenes para el frontend ───────────────────────────────────
    # Redimensionar a 500x500 para consistencia
    img_resized  = cv2.resize(img, (500, 500))
    mask_resized_bw = cv2.resize(mask, (500, 500))
    
    # Máscara en BLANCO Y NEGRO (binaria: 255 = detectado, 0 = no detectado)
    mask_visual = cv2.cvtColor(mask_resized_bw, cv2.COLOR_GRAY2BGR)
    
    # Máscara verde para overlay (verde puro donde hay fluorescencia)
    mask_verde = np.zeros_like(img_resized)
    mask_verde[mask_resized_bw > 0] = [0, 255, 0]  # Verde puro en BGR
    
    # Imagen con overlay: original + máscara verde semitransparente
    overlay = cv2.addWeighted(img_resized, 0.6, mask_verde, 0.4, 0)
    
    # Comparación horizontal: original | máscara_byn | overlay
    comparacion = np.hstack((img_resized, mask_visual, overlay))
    
    # ── Generar heatmap de intensidad ──────────────────────────────────────────
    # Mapa de calor basado en la intensidad V del canal HSV
    heatmap_data = hsv[:, :, 2].astype(np.float32)
    heatmap_data = cv2.resize(heatmap_data, (500, 500))
    
    # Normalizar entre 0-1 para visualización
    heatmap_norm = (heatmap_data - heatmap_data.min()) / (heatmap_data.max() - heatmap_data.min() + 1e-10)
    
    # Crear figura con matplotlib para el heatmap
    fig, ax = plt.subplots(figsize=(5, 5), dpi=100)
    im = ax.imshow(heatmap_norm, cmap='Greens', interpolation='bilinear')
    ax.set_title('Intensidad de Fluorescencia', fontsize=10, fontweight='bold')
    ax.set_xlabel('Píxeles (X)', fontsize=8)
    ax.set_ylabel('Píxeles (Y)', fontsize=8)
    cbar = plt.colorbar(im, ax=ax, label='Intensidad relativa')
    plt.tight_layout()
    
    # Convertir figura a imagen PNG en buffer
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    heatmap_img = cv2.imdecode(np.frombuffer(buf.read(), np.uint8), cv2.IMREAD_COLOR)
    plt.close(fig)
    buf.close()
    
    if heatmap_img is None:
        # Fallback si algo falla
        heatmap_img = cv2.cvtColor((heatmap_norm * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
 
    # ── Convertir a base64 para enviar al frontend ────────────────────────────
    def to_base64(imagen_cv2):
        """Convierte una imagen OpenCV a string base64."""
        _, buffer = cv2.imencode('.png', imagen_cv2)
        return base64.b64encode(buffer).decode('utf-8')
 
    original_b64    = to_base64(img_resized)
    mask_b64        = to_base64(mask_visual)  # Máscara blanco y negro
    overlay_b64     = to_base64(overlay)
    comparacion_b64 = to_base64(comparacion)
    heatmap_b64     = to_base64(heatmap_img)
 
    # ── Log en consola ────────────────────────────────────────────────────────
    print(f"Intensidad : {intensidad:.4f}")
    print(f"Área       : {area} píxeles")
    print(f"SNR        : {snr:.4f}")
    print(f"Contraste  : {contrast:.4f}")
    print(f"Heatmap    : Generado correctamente")
 
    # Retorna métricas + imágenes en base64 (9 valores)
    return intensidad, area, snr, contrast, mask_b64, original_b64, overlay_b64, comparacion_b64, heatmap_b64
 
 
if __name__ == "__main__":
    ruta_imagen = "image.jpg"
    intensidad, area, snr, contrast, mask_b64, original_b64, overlay_b64, comparacion_b64, heatmap_b64 = analizar_imagen(ruta_imagen)
    print("¡Procesamiento completado!")