import cv2
import numpy as np
from typing import List, Dict, Tuple, Any
from skimage import exposure


def correct_illumination(image: np.ndarray) -> np.ndarray:
    """Apply CLAHE on the L channel to correct uneven illumination.

    Returns image in BGR color space.
    """
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    corrected = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    return corrected


def denoise_image(image: np.ndarray) -> np.ndarray:
    """Denoise color image using Non-local Means (fastNlMeansDenoisingColored)."""
    return cv2.fastNlMeansDenoisingColored(image, None, h=10, hColor=10, templateWindowSize=7, searchWindowSize=21)


def compute_green_excess(image: np.ndarray) -> np.ndarray:
    """Compute green dominance map normalized to [0,1].

    green_excess = G - 0.5*(R+B)
    """
    b, g, r = cv2.split(image.astype(np.float32))
    green_excess = g - 0.5 * (r + b)
    # zero negative values
    green_excess[green_excess < 0] = 0.0
    maxv = green_excess.max() if green_excess.max() > 0 else 1.0
    return (green_excess / maxv).astype(np.float32)


def detect_rois(image: np.ndarray, threshold: float = None, min_area: int = 50) -> List[Dict[str, Any]]:
    """Detect ROIs based on green-excess map.

    Returns list of regions with bbox, area, centroid and mask.
    """
    img = image.copy()
    img = correct_illumination(img)
    img = denoise_image(img)
    ge = compute_green_excess(img)

    # threshold
    gray8 = (np.clip(ge, 0, 1) * 255).astype(np.uint8)
    if threshold is None:
        _, th = cv2.threshold(gray8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        thv = int(np.clip(threshold, 0.0, 1.0) * 255)
        _, th = cv2.threshold(gray8, thv, 255, cv2.THRESH_BINARY)

    # morphological clean
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel, iterations=1)
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, kernel, iterations=1)

    contours, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    rois: List[Dict[str, Any]] = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        mask = np.zeros(gray8.shape, dtype=np.uint8)
        cv2.drawContours(mask, [cnt], -1, 255, -1)
        # feature extraction
        mean_intensity = float(ge[mask.astype(bool)].mean()) if area > 0 else 0.0
        moments = cv2.moments(cnt)
        if moments.get('m00', 0) != 0:
            cx = moments['m10'] / moments['m00']
            cy = moments['m01'] / moments['m00']
        else:
            cx, cy = x + w / 2.0, y + h / 2.0

        rois.append({
            'bbox': (int(x), int(y), int(w), int(h)),
            'area': int(area),
            'centroid': (float(cx), float(cy)),
            'mean_green_excess': mean_intensity,
            'mask': mask,
        })

    # sort by area desc
    rois.sort(key=lambda r: r['area'], reverse=True)
    return rois


def extract_roi_features(image: np.ndarray, roi_mask: np.ndarray) -> Dict[str, Any]:
    """Extract simple features from ROI mask: mean, median, std, max, snr_estimate."""
    ge = compute_green_excess(image)
    mask_bool = roi_mask.astype(bool)
    values = ge[mask_bool]
    if values.size == 0:
        return {'mean': 0.0, 'median': 0.0, 'std': 0.0, 'max': 0.0, 'snr': 0.0}
    mean = float(values.mean())
    median = float(np.median(values))
    std = float(values.std())
    maxv = float(values.max())
    # approximate background std from border
    bmask = (~mask_bool)
    bvals = ge[bmask]
    bstd = float(bvals.std()) if bvals.size > 0 else 1e-6
    snr = mean / (bstd + 1e-9)
    return {'mean': mean, 'median': median, 'std': std, 'max': maxv, 'snr': snr}
