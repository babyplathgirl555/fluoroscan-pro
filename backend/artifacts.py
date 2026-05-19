import cv2
import numpy as np
from typing import Dict, Any


def detect_saturation(image: np.ndarray, threshold: int = 250) -> Dict[str, Any]:
    """Detect percentage of saturated pixels (any channel >= threshold)."""
    sat = np.any(image >= threshold, axis=2)
    pct = float(sat.sum()) / float(sat.size) * 100.0
    return {'saturation_pct': pct, 'saturated_pixels': int(sat.sum())}


def detect_blur(image: np.ndarray) -> Dict[str, Any]:
    """Estimate blur using variance of Laplacian (lower -> blur)."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    var = cv2.Laplacian(gray, cv2.CV_64F).var()
    return {'var_laplacian': float(var), 'is_blurry': var < 100.0}


def detect_noise(image: np.ndarray) -> Dict[str, Any]:
    """Rough noise estimate using high-pass residual std deviation."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
    # simple high-pass: subtract gaussian blurred
    blur = cv2.GaussianBlur(gray, (7, 7), 0)
    resid = gray - blur
    std = float(resid.std())
    return {'noise_std': std, 'is_noisy': std > 10.0}


def detect_artifacts(image: np.ndarray) -> Dict[str, Any]:
    sat = detect_saturation(image)
    blur = detect_blur(image)
    noise = detect_noise(image)
    # aggregate
    artifacts = {
        'saturation_pct': sat['saturation_pct'],
        'saturated_pixels': sat['saturated_pixels'],
        'var_laplacian': blur['var_laplacian'],
        'is_blurry': blur['is_blurry'],
        'noise_std': noise['noise_std'],
        'is_noisy': noise['is_noisy'],
    }
    # simple flags
    artifacts['has_artifact'] = artifacts['saturation_pct'] > 1.0 or artifacts['is_blurry'] or artifacts['is_noisy']
    return artifacts
