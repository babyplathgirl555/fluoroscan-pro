import cv2
import numpy as np


def validate_image(img: np.ndarray) -> np.ndarray:
    if img is None:
        raise ValueError("Imagen inválida o vacía")
    if not isinstance(img, np.ndarray):
        raise ValueError("La imagen debe ser un array de NumPy")
    if img.size == 0:
        raise ValueError("La imagen no contiene datos")
    if img.ndim not in (2, 3):
        raise ValueError("La imagen debe ser en escala de grises o color BGR")
    return img


def get_green_channel(img: np.ndarray) -> np.ndarray:
    img = validate_image(img)
    if img.ndim == 2:
        return img.astype(np.float32)
    if img.shape[2] != 3:
        raise ValueError("La imagen debe tener 3 canales BGR")
    return img[:, :, 1].astype(np.float32)


def normalize_channel(channel: np.ndarray) -> np.ndarray:
    channel = np.asarray(channel, dtype=np.float32)
    if channel.size == 0:
        raise ValueError("El canal está vacío")
    min_val = float(np.min(channel))
    max_val = float(np.max(channel))
    if np.isclose(max_val, min_val):
        return np.zeros_like(channel, dtype=np.float32)
    return (channel - min_val) / (max_val - min_val)


def get_fluorescence_mask(
    img: np.ndarray,
    lower_green: tuple[int, int, int] = (40, 100, 100),
    upper_green: tuple[int, int, int] = (80, 255, 255),
    brightness_threshold: int = 100,
) -> np.ndarray:
    img = validate_image(img)
    if img.ndim != 3 or img.shape[2] != 3:
        raise ValueError("El análisis de fluorescencia requiere imagen BGR de 3 canales")

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask_color = cv2.inRange(hsv, np.array(lower_green, dtype=np.uint8), np.array(upper_green, dtype=np.uint8))
    brightness_mask = (hsv[:, :, 2] > brightness_threshold).astype(np.uint8) * 255
    mask = cv2.bitwise_and(mask_color, mask_color, mask=brightness_mask)
    return mask


def get_heatmap_mask(heatmap: np.ndarray, threshold: float = 0.5) -> np.ndarray:
    heatmap = np.asarray(heatmap, dtype=np.float32)
    if heatmap.size == 0:
        raise ValueError("El heatmap está vacío")
    if heatmap.ndim != 2:
        raise ValueError("El heatmap debe ser una matriz 2D normalizada")
    normalized = normalize_channel(heatmap)
    return (normalized >= float(threshold)).astype(np.uint8) * 255


def calculate_intensity_statistics(
    channel: np.ndarray,
    mask: np.ndarray | None = None,
    normalized: bool = False,
) -> dict:
    channel = np.asarray(channel, dtype=np.float32)
    if mask is not None:
        mask = np.asarray(mask)
        if mask.ndim == 3:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
        channel = channel[mask > 0]
    if channel.size == 0:
        raise ValueError("No hay píxeles válidos para calcular estadísticas de intensidad")

    if normalized:
        channel = normalize_channel(channel)

    return {
        "mean": float(np.mean(channel)),
        "median": float(np.median(channel)),
        "max": float(np.max(channel)),
        "min": float(np.min(channel)),
        "std": float(np.std(channel, ddof=0)),
        "variance": float(np.var(channel, ddof=0)),
        "percentile_95": float(np.percentile(channel, 95)),
    }


def calculate_spatial_statistics(
    mask: np.ndarray,
    image_shape: tuple[int, int] | None = None,
) -> dict:
    mask = np.asarray(mask, dtype=np.uint8)
    if mask.ndim == 3:
        mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
    if mask.size == 0:
        raise ValueError("La máscara está vacía")

    mask_binary = (mask > 0).astype(np.uint8)
    area = int(np.count_nonzero(mask_binary))

    if image_shape is None:
        image_shape = mask_binary.shape[:2]
    total_pixels = int(image_shape[0]) * int(image_shape[1])
    percent = float((area / total_pixels) * 100) if total_pixels else 0.0

    centroid = None
    uniformity = 0.0
    if area > 0:
        ys, xs = np.nonzero(mask_binary)
        cx = float(np.mean(xs))
        cy = float(np.mean(ys))
        centroid = {"x": cx, "y": cy}

        distances = np.linalg.norm(np.stack((xs - cx, ys - cy), axis=1), axis=1)
        dispersion = float(np.std(distances, ddof=0))
        max_diagonal = np.sqrt(image_shape[0] ** 2 + image_shape[1] ** 2) / 2
        uniformity = float(max(0.0, 1.0 - (dispersion / (max_diagonal + 1e-10))))

    return {
        "area_pixels": area,
        "percent": percent,
        "centroid": centroid,
        "uniformity": uniformity,
    }


def analyze_image_statistics(
    img: np.ndarray,
    brightness_threshold: int = 100,
    heatmap_threshold: float = 0.5,
) -> dict:
    img = validate_image(img)
    green_channel = get_green_channel(img)
    normalized_green = normalize_channel(green_channel)
    fluorescence_mask = get_fluorescence_mask(img, brightness_threshold=brightness_threshold)
    heatmap_mask = get_heatmap_mask(normalized_green, threshold=heatmap_threshold)

    intensity_stats = calculate_intensity_statistics(
        normalized_green,
        mask=fluorescence_mask,
        normalized=True,
    )

    spatial_stats = calculate_spatial_statistics(fluorescence_mask, image_shape=img.shape[:2])

    return {
        "intensity_stats": intensity_stats,
        "spatial_stats": spatial_stats,
        "heatmap_mask_pixels": int(np.count_nonzero(heatmap_mask)),
    }
