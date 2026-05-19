import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit
from scipy.interpolate import UnivariateSpline


# ── Modelo de fluorescencia ────────────────────────────────────────────────────
def modelo_fluorescencia(x, a, b, c):
    """
    Modelo: I(x) = a * exp(-b * x) + c
    a: amplitud máxima
    b: tasa de decaimiento
    c: línea base (offset)
    """
    return a * np.exp(-b * x) + c


# ── Función principal ──────────────────────────────────────────────────────────
def analizar_datos(concentraciones, intensidades):
    """
    Ajusta un modelo de fluorescencia a los datos dados.
    - Siempre genera la curva (modelo o interpolación de fallback).
    - Solo reporta parámetros si el ajuste es estadísticamente válido.
    - Nunca lanza excepción por fallo de convergencia.

    Parámetros
    ----------
    concentraciones : array-like  (deben ser > 0)
    intensidades    : array-like  (deben ser >= 0)

    Retorna
    -------
    concentracion_optima : float
    intensidad_max       : float
    """
    # ── Validación de entrada ──────────────────────────────────────────────────
    x = np.asarray(concentraciones, dtype=float)
    y = np.asarray(intensidades,    dtype=float)

    if x.ndim != 1 or y.ndim != 1:
        raise ValueError("concentraciones e intensidades deben ser vectores 1-D.")
    if len(x) != len(y):
        raise ValueError(
            f"Longitudes distintas: concentraciones={len(x)}, intensidades={len(y)}."
        )
    if len(x) < 3:
        raise ValueError("Se necesitan al menos 3 puntos para el análisis.")
    if np.any(x <= 0):
        raise ValueError("Todas las concentraciones deben ser estrictamente > 0.")
    if np.any(y < 0):
        raise ValueError("Las intensidades no pueden ser negativas.")
    if np.any(~np.isfinite(x)) or np.any(~np.isfinite(y)):
        raise ValueError("Los datos contienen NaN o Inf.")

    # ── Ordenar por concentración ──────────────────────────────────────────────
    orden = np.argsort(x)
    x, y  = x[orden], y[orden]

    # ── Estimación de valores iniciales robusta ────────────────────────────────
    idx_max = np.argmax(y)
    a0 = float(np.max(y) - np.min(y))          # amplitud neta
    # b0: inverso de la escala horizontal (evita /0)
    x_rango = x[-1] - x[0]
    b0 = 1.0 / x_rango if x_rango > 0 else 1.0
    c0 = float(np.min(y))                       # offset ~ línea base

    p0 = [max(a0, 1e-9), max(b0, 1e-9), max(c0, 0.0)]

    # ── Intentar ajuste ────────────────────────────────────────────────────────
    ajuste_exitoso = False
    params = perr = None

    try:
        params, pcov = curve_fit(
            modelo_fluorescencia,
            x, y,
            p0=p0,
            bounds=(0, np.inf),
            maxfev=50_000,
            method="trf",           # Trust Region Reflective: más robusto
        )
        perr = np.sqrt(np.diag(pcov))

        # Validar que las incertidumbres sean finitas y razonables
        if np.all(np.isfinite(perr)) and np.all(perr < 1e6):
            ajuste_exitoso = True
        else:
            print("Advertencia: Ajuste convergió pero las incertidumbres son inestables.")

    except Exception as e:
        print(f"Advertencia: Ajuste no convergió ({type(e).__name__}: {e}).")

    # ── Generar curva suave SIEMPRE ────────────────────────────────────────────
    x_smooth = np.linspace(x[0], x[-1], 300)

    if ajuste_exitoso:
        y_smooth   = modelo_fluorescencia(x_smooth, *params)
        etiqueta   = "Modelo ajustado"
        estilo     = dict(color="palevioletred", linewidth=2.2, linestyle="-")
    else:
        # Fallback: spline suavizada (k=min para evitar errores con pocos puntos)
        k = min(3, len(x) - 1)
        try:
            spline   = UnivariateSpline(x, y, k=k, s=0)
            y_smooth = np.clip(spline(x_smooth), 0, None)   # no negativos
        except Exception:
            # Último recurso: interpolación lineal simple
            y_smooth = np.interp(x_smooth, x, y)
        etiqueta = "Interpolación (fallback)"
        estilo   = dict(color="gray", linewidth=2, linestyle="--")

    # ── Punto óptimo sobre la curva suave ─────────────────────────────────────
    idx_opt            = int(np.argmax(y_smooth))
    concentracion_opt  = float(x_smooth[idx_opt])
    intensidad_max     = float(y_smooth[idx_opt])

    # ── Gráfico ────────────────────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(8, 5))

    ax.scatter(x, y, color="deeppink", zorder=5, s=60, label="Datos experimentales")
    ax.plot(x_smooth, y_smooth, **estilo, label=etiqueta)
    ax.scatter(concentracion_opt, intensidad_max,
               color="red", s=120, zorder=6, label="Óptimo")
    ax.axvline(concentracion_opt, linestyle="--", alpha=0.45, color="red")
    ax.axhline(intensidad_max,    linestyle="--", alpha=0.45, color="red")

    ax.set_xlabel("Concentración (mg/mL)")
    ax.set_ylabel("Intensidad (a.u.)")
    ax.set_title("Análisis de Fluorescencia")
    ax.legend()
    fig.tight_layout()
    plt.show()

    # ── Reporte en consola ─────────────────────────────────────────────────────
    print("=" * 45)
    print(f"  Concentración óptima : {concentracion_opt:.4f} mg/mL")
    print(f"  Intensidad máxima    : {intensidad_max:.4f} a.u.")
    if ajuste_exitoso:
        print(f"\n  Parámetros (a, b, c) : {np.round(params, 4)}")
        print(f"  Incertidumbres       : {np.round(perr, 4)}")
    else:
        print("\n  Advertencia: Parámetros no reportados (ajuste fallido o inestable).")
    print("=" * 45)

    return concentracion_opt, intensidad_max
