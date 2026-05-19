import os
import io
import time
import base64

import cv2
import numpy as np
import matplotlib.pyplot as plt

from estadisticas import get_fluorescence_mask, normalize_channel

RESULTS_DIR = "result_images"
os.makedirs(RESULTS_DIR, exist_ok=True)


def _validate_image(img: np.ndarray) -> np.ndarray:
    if img is None:
        raise ValueError("Imagen inválida o vacía")
    if not isinstance(img, np.ndarray):
        raise ValueError("La imagen debe ser un array de NumPy")
    if img.size == 0:
        raise ValueError("La imagen no contiene datos")
    if img.ndim != 3 or img.shape[2] != 3:
        raise ValueError("La imagen debe ser BGR de 3 canales")
    return img


def _ensure_directory(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)


def image_to_base64(image: np.ndarray) -> str:
    _, buffer = cv2.imencode('.png', image)
    return base64.b64encode(buffer).decode('utf-8')


def save_image(path: str, image: np.ndarray) -> str:
    _ensure_directory(path)
    if not cv2.imwrite(path, image):
        raise IOError(f"No se pudo guardar la imagen en: {path}")
    return path


def resize_image(image: np.ndarray, size: tuple[int, int] = (500, 500)) -> np.ndarray:
    return cv2.resize(image, size, interpolation=cv2.INTER_AREA)


def mask_to_bgr(mask: np.ndarray) -> np.ndarray:
    if mask.ndim == 3:
        mask_gray = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
    else:
        mask_gray = mask
    return cv2.cvtColor(mask_gray, cv2.COLOR_GRAY2BGR)


def build_overlay(image: np.ndarray, mask: np.ndarray, alpha: float = 0.35) -> np.ndarray:
    image = _validate_image(image)
    if mask.ndim == 3:
        mask_gray = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
    else:
        mask_gray = mask

    mask_binary = (mask_gray > 0).astype(np.uint8)
    overlay_color = np.zeros_like(image)
    overlay_color[mask_binary > 0] = [0, 255, 0]
    return cv2.addWeighted(image, 0.6, overlay_color, alpha, 0)


def build_heatmap(image: np.ndarray, size: tuple[int, int] = (500, 500), cmap: str = 'Greens') -> np.ndarray:
    image = _validate_image(image)
    red_channel = image[:, :, 2].astype(np.float32)
    green_channel = image[:, :, 1].astype(np.float32)
    blue_channel = image[:, :, 0].astype(np.float32)

    # Usar una medida de "verde dominante" para evitar que zonas brillantes no verdes aparezcan como intensas.
    green_excess = green_channel - 0.5 * (red_channel + blue_channel)
    green_excess = np.clip(green_excess, 0, 255)
    intensity_norm = normalize_channel(green_excess)
    intensity_norm = cv2.resize(intensity_norm, size, interpolation=cv2.INTER_AREA)

    fig, ax = plt.subplots(figsize=(5, 5), dpi=100)
    heatmap_image = ax.imshow(intensity_norm, cmap=cmap, vmin=0, vmax=1, interpolation='bilinear')
    ax.set_title('Intensidad de Fluorescencia', fontsize=10, fontweight='bold')
    ax.set_xlabel('Píxeles (X)', fontsize=8)
    ax.set_ylabel('Píxeles (Y)', fontsize=8)
    cbar = plt.colorbar(heatmap_image, ax=ax, fraction=0.046, pad=0.04)
    cbar.set_label('Intensidad relativa', fontsize=8)
    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    heatmap_bgr = cv2.imdecode(np.frombuffer(buf.read(), np.uint8), cv2.IMREAD_COLOR)
    plt.close(fig)

    if heatmap_bgr is None:
        heatmap_bgr = cv2.cvtColor((intensity_norm * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    return heatmap_bgr


def build_results_images(
    image: np.ndarray,
    brightness_threshold: int = 100,
    output_dir: str = RESULTS_DIR,
    prefix: str = None,
) -> dict:
    image = _validate_image(image)
    original = resize_image(image)

    mask = get_fluorescence_mask(image, brightness_threshold=brightness_threshold)
    mask_resized = resize_image(mask)

    overlay = build_overlay(original, mask_resized)
    heatmap = build_heatmap(image)

    if prefix is None:
        prefix = f"result_{int(time.time())}"
    safe_prefix = os.path.splitext(prefix)[0]

    original_path = os.path.join(output_dir, f"{safe_prefix}_original.png")
    overlay_path = os.path.join(output_dir, f"{safe_prefix}_overlay.png")
    heatmap_path = os.path.join(output_dir, f"{safe_prefix}_heatmap.png")

    save_image(original_path, original)
    save_image(overlay_path, overlay)
    save_image(heatmap_path, heatmap)

    return {
        "original_base64": image_to_base64(original),
        "overlay_base64": image_to_base64(overlay),
        "heatmap_base64": image_to_base64(heatmap),
        "original_path": original_path,
        "overlay_path": overlay_path,
        "heatmap_path": heatmap_path,
    }
