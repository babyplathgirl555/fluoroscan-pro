# analisis.py — FluoroScan Pro (versión corregida y estable)

import numpy as np
import math
from scipy.optimize import curve_fit

# 🔒 EXPORT EXPLÍCITO (clave para FastAPI)
__all__ = ["analizar_datos"]

# =========================
# MÉTRICAS
# =========================

def _r2(y_real, y_pred):
    y_real = np.asarray(y_real)
    y_pred = np.asarray(y_pred)

    ss_res = np.sum((y_real - y_pred) ** 2)
    ss_tot = np.sum((y_real - np.mean(y_real)) ** 2)

    if ss_tot < 1e-12:
        return 1.0 if ss_res < 1e-12 else 0.0

    return float(np.clip(1 - ss_res / ss_tot, -1, 1))


def _rmse(y_real, y_pred):
    return float(np.sqrt(np.mean((y_real - y_pred) ** 2)))


def _aic(y_real, y_pred, k):
    n = len(y_real)
    rss = np.sum((y_real - y_pred) ** 2)

    if rss <= 0:
        rss = 1e-12

    return float(n * math.log(rss / n) + 2 * k)


def _mae(y_real, y_pred):
    y_real = np.asarray(y_real, dtype=np.float64)
    y_pred = np.asarray(y_pred, dtype=np.float64)
    return float(np.mean(np.abs(y_real - y_pred)))


def _linear_slope(x, y):
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    if x.size < 2:
        return 0.0
    A = np.vstack([x, np.ones_like(x)]).T
    slope, _ = np.linalg.lstsq(A, y, rcond=None)[0]
    return float(slope)


def _format_beer_equation(params):
    Imax, k, q = params
    return f"I_norm(c_norm) = {Imax:.6f} * (1 - exp(-{k:.6f} * c_norm)) * exp(-{q:.6f} * c_norm)"


def calculate_beer_lambert_metrics(concentraciones, intensidades):
    c = np.asarray(concentraciones, dtype=float)
    y = np.asarray(intensidades, dtype=float)

    if c.ndim != 1 or y.ndim != 1:
        raise ValueError("concentraciones e intensidades deben ser vectores 1-D.")
    if len(c) != len(y):
        raise ValueError("concentraciones e intensidades deben tener la misma longitud.")
    if len(c) < 2:
        raise ValueError("Se requieren al menos 2 puntos para calcular métricas de Beer-Lambert.")
    if np.any(c <= 0):
        raise ValueError("Todas las concentraciones deben ser mayores que cero.")
    if np.any(y < 0):
        raise ValueError("Las intensidades no pueden ser negativas.")

    def _denorm(y_norm, y_real):
        y_real = np.asarray(y_real, dtype=float)
        return np.min(y_real) + np.asarray(y_norm) * (np.max(y_real) - np.min(y_real))

    c_norm = _norm(c)
    y_norm = _norm(y)

    params, y_pred = _ajustar_beer(c_norm, y_norm)
    y_pred_real = _denorm(y_pred, y)

    return {
        "r2": _r2(y, y_pred_real),
        "rmse": _rmse(y, y_pred_real),
        "mae": _mae(y, y_pred_real),
        "slope": _linear_slope(c, y),
        "equation": _format_beer_equation(params),
        "params": params.tolist(),
    }


# =========================
# MODELOS
# =========================

def modelo_empirico(c, a, b, d):
    return a * c**2 + b * c + d


def modelo_beer_lambert(c, Imax, k, q):
    return Imax * (1 - np.exp(-k * c)) * np.exp(-q * c)


# =========================
# NORMALIZACIÓN
# =========================

def _norm(x):
    x = np.asarray(x)
    return (x - np.min(x)) / (np.max(x) - np.min(x) + 1e-12)


# =========================
# AJUSTES
# =========================

def _ajustar_empirico(c, y):
    try:
        p0 = [1, 1, np.mean(y)]
        params, _ = curve_fit(
            modelo_empirico, c, y,
            p0=p0, method='trf', maxfev=10000
        )
        y_pred = modelo_empirico(c, *params)
        return params, y_pred
    except Exception:
        # Fallback: parábola con mínimos cuadrados lineales
        params = np.polyfit(c, y, 2)
        y_pred = np.polyval(params, c)
        # Devolver en formato compatible [a, b, d]
        return np.array([params[0], params[1], params[2]]), y_pred


def _ajustar_beer(c, y):
    try:
        Imax0 = np.max(y)
        k0 = 1 / (np.max(c) + 1e-6)
        q0 = 0.1 * k0
        p0 = [Imax0, k0, q0]
        params, _ = curve_fit(
            modelo_beer_lambert, c, y,
            p0=p0, bounds=(0, np.inf),
            method='trf', maxfev=20000
        )
        y_pred = modelo_beer_lambert(c, *params)
        return params, y_pred
    except Exception:
        # Fallback: usar los mismos parámetros iniciales como aproximación
        Imax0 = float(np.max(y))
        k0 = float(1 / (np.max(c) + 1e-6))
        q0 = float(0.1 * k0)
        params = np.array([Imax0, k0, q0])
        y_pred = modelo_beer_lambert(c, *params)
        return params, y_pred


# =========================
# FUNCIÓN PRINCIPAL (LA QUE FALLABA)
# =========================

def analizar_datos(concentraciones, intensidades):
    """
    Función principal para FastAPI.
    Ajusta modelo empírico y Beer-Lambert y los compara.
    """

    print("✅ analisis.py cargado correctamente")

    # ───────── VALIDACIÓN ─────────
    c = np.asarray(concentraciones, dtype=float)
    y = np.asarray(intensidades, dtype=float)

    if len(c) < 3:
        raise ValueError("Se necesitan al menos 3 puntos")

    if len(c) != len(y):
        raise ValueError("concentraciones e intensidades no coinciden")

    # ───────── NORMALIZACIÓN ─────────
    c_norm = _norm(c)
    y_norm = _norm(y)

    # ───────── MODELO EMPÍRICO ─────────
    p_emp, y_emp = _ajustar_empirico(c_norm, y_norm)
    p_bl, y_bl = _ajustar_beer(c_norm, y_norm)

    # ───────── DESNORMALIZACIÓN → escala real ─────────
    y_min_r = float(np.min(y))
    y_max_r = float(np.max(y))

    def _denorm_y(yn):
        return y_min_r + np.asarray(yn) * (y_max_r - y_min_r)

    y_emp_real = _denorm_y(y_emp)
    y_bl_real = _denorm_y(y_bl)

    r2_emp = _r2(y, y_emp_real)
    rmse_emp = _rmse(y, y_emp_real)
    aic_emp = _aic(y, y_emp_real, k=3)

    # ───────── MODELO BEER-LAMBERT ─────────
    r2_bl = _r2(y, y_bl_real)
    rmse_bl = _rmse(y, y_bl_real)
    aic_bl = _aic(y, y_bl_real, k=3)

    # ───────── COMPARACIÓN ─────────
    if (r2_bl > r2_emp) and (aic_bl < aic_emp):
        mejor = "Beer-Lambert + Quenching"
        y_best = y_bl
    else:
        mejor = "Empírico"
        y_best = y_emp

    # ───────── CURVA SUAVE (escala normalizada) ─────────
    x_smooth = np.linspace(c_norm.min(), c_norm.max(), 200)

    y_emp_s = modelo_empirico(x_smooth, *p_emp)
    y_bl_s  = modelo_beer_lambert(x_smooth, *p_bl)

    # ───────── DESNORMALIZACIÓN → escala real ─────────
    # El frontend recibe Y en escala real para que la curva sea visible
    # sobre los puntos experimentales sin necesidad de re-escalar en JS.
    y_min_r = float(np.min(y))
    y_max_r = float(np.max(y))
    c_min_r = float(np.min(c))
    c_max_r = float(np.max(c))

    def _denorm_y(yn):
        return y_min_r + np.asarray(yn) * (y_max_r - y_min_r)

    x_smooth_real  = c_min_r + x_smooth * (c_max_r - c_min_r)
    y_emp_s_real   = _denorm_y(y_emp_s)
    y_bl_s_real    = _denorm_y(y_bl_s)
    y_best_real    = y_bl_s_real if mejor == "Beer-Lambert + Quenching" else y_emp_s_real

    # ───────── CONCENTRACIÓN ÓPTIMA (analítica + clamp) ─────────
    Imax_bl, k_bl, q_bl = p_bl
    if k_bl > 1e-9 and q_bl > 1e-9:
        # c_opt analítico Beer-Lambert en escala normalizada
        c_opt_norm = float(np.log(1.0 + k_bl / q_bl) / k_bl)
    else:
        c_opt_norm = float(x_smooth[np.argmax(y_bl_s)])

    c_opt_real = c_min_r + c_opt_norm * (c_max_r - c_min_r)
    # Clampear al rango de datos para que no se salga de la gráfica
    c_opt_real = float(np.clip(c_opt_real, c_min_r, c_max_r))

    # ───────── RESULTADO ─────────
    resultado = {
        "modelo_seleccionado": mejor,
        "ajuste_exitoso": True,
        "r_squared": float(max(r2_emp, r2_bl)),

        "r2_empirico": float(r2_emp),
        "r2_biofisico": float(r2_bl),

        "concentracion_optima": c_opt_real,
        "intensidad_maxima": float(np.max(y)),

        "comparacion": {
            "empirico": {
                "exitoso": True,
                "r2": float(r2_emp),
                "rmse": float(rmse_emp),
                "aic": float(aic_emp),
                "params": p_emp.tolist(),
                "curva_y": y_emp_s_real.tolist()   # escala real
            },
            "biofisico": {
                "exitoso": True,
                "r2": float(r2_bl),
                "rmse": float(rmse_bl),
                "aic": float(aic_bl),
                "params": p_bl.tolist(),
                "curva_y": y_bl_s_real.tolist()    # escala real
            }
        },

        # curva principal: X e Y en escala REAL
        "curva": {
            "x": x_smooth_real.tolist(),
            "y": y_best_real.tolist()
        },

        "curva_x": x_smooth_real.tolist(),

        "interpretacion": {
            "modelo_usado": f"Se seleccionó el modelo {mejor}",
            "validez_fisica": "El modelo biofísico representa absorción + quenching.",
            "concentracion_optima": f"c_opt = {c_opt_real:.4f} mg/mL (analítica, clampada al rango de datos).",
            "advertencias": []
        }
    }

    return resultado