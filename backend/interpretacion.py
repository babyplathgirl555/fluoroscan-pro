# interpretacion.py — FluoroScan Pro
# Sistema de interpretación científica automática de resultados de fluorescencia
#
# Analiza métricas cuantitativas y genera conclusiones biofísicas coherentes.

"""
Módulo de Interpretación Científica Automática

Este módulo implementa un sistema de reglas basadas en umbrales para generar
interpretaciones automáticas de resultados de análisis de fluorescencia.

Las interpretaciones se generan analizando:
- Estadísticas de intensidad (media, desviación estándar, máximo)
- Estadísticas espaciales (uniformidad, área, porcentaje fluorescente)
- Métricas del modelo Beer-Lambert (R², RMSE, MAE)
"""

# ── UMBRALES DE INTERPRETACIÓN ──────────────────────────────────────────────

# Intensidad
INTENSIDAD_BAJA = 0.2
INTENSIDAD_MEDIA = 0.5
INTENSIDAD_ALTA = 0.75
INTENSIDAD_SATURACION = 0.95

# Desviación estándar (heterogeneidad)
HETEROGENEIDAD_BAJA = 0.15
HETEROGENEIDAD_MEDIA = 0.35
HETEROGENEIDAD_ALTA = 0.50

# Uniformidad espacial
UNIFORMIDAD_BAJA = 0.3
UNIFORMIDAD_MEDIA = 0.6
UNIFORMIDAD_ALTA = 0.8

# Porcentaje fluorescente
PORCENTAJE_BAJO = 5.0
PORCENTAJE_MEDIO = 20.0
PORCENTAJE_ALTO = 50.0

# Modelo Beer-Lambert
R2_POBRE = 0.7
R2_BUENO = 0.85
R2_EXCELENTE = 0.95

RMSE_BAJO = 0.05
RMSE_MEDIO = 0.15
RMSE_ALTO = 0.30

MAE_BAJO = 0.03
MAE_MEDIO = 0.10
MAE_ALTO = 0.20


# ── FUNCIONES DE INTERPRETACIÓN ─────────────────────────────────────────────

def interpret_intensity_stats(intensity_stats: dict) -> list[str]:
    """
    Analiza estadísticas de intensidad y genera conclusiones.

    Parámetros:
        intensity_stats (dict): Dict con keys: mean, median, max, min, std, variance, p95

    Retorna:
        list[str]: Lista de conclusiones sobre intensidad fluorescente
    """
    conclusions = []

    mean_intensity = intensity_stats.get("mean", 0.0)
    std_intensity = intensity_stats.get("std", 0.0)
    max_intensity = intensity_stats.get("max", 0.0)
    min_intensity = intensity_stats.get("min", 0.0)

    # Análisis de nivel de intensidad
    if mean_intensity >= INTENSIDAD_SATURACION:
        conclusions.append(
            "Advertencia: Se detecta posible saturación fluorescente o autoextinción (quenching). "
            "Considere reducir el tiempo de exposición o concentración."
        )
    elif mean_intensity >= INTENSIDAD_ALTA:
        conclusions.append(
            "La muestra presenta intensidad fluorescente elevada, indicando buena "
            "penetración y carga del fluoróforo."
        )
    elif mean_intensity >= INTENSIDAD_MEDIA:
        conclusions.append(
            "○ Intensidad fluorescente moderada. El fluoróforo se distribuye de forma "
            "adecuada en la muestra."
        )
    elif mean_intensity < INTENSIDAD_BAJA:
        conclusions.append(
            "Nota: La muestra presenta intensidad fluorescente baja. Verifique concentración "
            "del fluoróforo o condiciones de iluminación."
        )

    # Análisis de heterogeneidad (desviación estándar)
    cv = (std_intensity / (mean_intensity + 1e-10))  # Coeficiente de variación
    if cv >= HETEROGENEIDAD_ALTA:
        conclusions.append(
            "Advertencia: La muestra presenta distribución altamente heterogénea de fluorescencia. "
            "Posible presencia de cristales, precipitados o zonas de alta concentración local."
        )
    elif cv >= HETEROGENEIDAD_MEDIA:
        conclusions.append(
            "○ Se observa distribución heterogénea moderada de fluorescencia, "
            "consistente con muestras biológicas o complejas."
        )
    elif cv < HETEROGENEIDAD_BAJA:
        conclusions.append(
            "La distribución de fluorescencia es homogénea y uniforme en toda la muestra."
        )

    # Análisis de rango dinámico
    if max_intensity > 0:
        dynamic_range = max_intensity / (min_intensity + 1e-10)
        if dynamic_range > 50:
            conclusions.append(
                "Nota: Se detecta amplio rango dinámico de intensidad. Existen regiones con "
                "concentraciones muy dispares de fluoróforo."
            )

    return conclusions


def interpret_spatial_stats(spatial_stats: dict) -> list[str]:
    """
    Analiza estadísticas espaciales y genera conclusiones.

    Parámetros:
        spatial_stats (dict): Dict con keys: fluorescent_area, fluorescent_percentage,
                             centroid_x, centroid_y, uniformity

    Retorna:
        list[str]: Lista de conclusiones sobre distribución espacial
    """
    conclusions = []

    fluorescent_percentage = spatial_stats.get("fluorescent_percentage", 0.0)
    uniformity = spatial_stats.get("uniformity", 0.0)
    centroid = spatial_stats.get("centroid")

    # Análisis de cobertura
    if fluorescent_percentage >= PORCENTAJE_ALTO:
        conclusions.append(
            "Cobertura espacial elevada: La fluorescencia se extiende sobre más del 50% "
            "del área, indicando penetración profunda y homogénea del fluoróforo."
        )
    elif fluorescent_percentage >= PORCENTAJE_MEDIO:
        conclusions.append(
            "○ Cobertura espacial moderada (~20%). El fluoróforo se distribuye en zonas "
            "bien definidas de la muestra."
        )
    elif fluorescent_percentage > 0:
        conclusions.append(
            "Nota: Cobertura espacial limitada (<5%). Posible distribución localizada o "
            "penetración selectiva del fluoróforo."
        )
    else:
        conclusions.append(
            "Advertencia: No se detectó fluorescencia. Verifique que la muestra contiene el fluoróforo."
        )

    # Análisis de uniformidad
    if uniformity >= UNIFORMIDAD_ALTA:
        conclusions.append(
            "La fluorescencia presenta distribución espacial altamente uniforme y homogénea, "
            "consistente con muestras well-mixed o soluciones homogéneas."
        )
    elif uniformity >= UNIFORMIDAD_MEDIA:
        conclusions.append(
            "○ Uniformidad moderada. Existen regiones con variabilidad espacial de intensidad, "
            "típico de tejidos o muestras heterogéneas."
        )
    elif uniformity > 0:
        conclusions.append(
            "Advertencia: Distribución muy dispersa y heterogénea. El fluoróforo presenta acumulaciones "
            "localizadas o penetración irregular."
        )

    # Análisis de localización
    if centroid:
        cx = centroid.get("x", 0)
        cy = centroid.get("y", 0)
        # Si el centroide está fuera del tercio central, indica sesgo espacial
        if 0.33 < (cx / 500) < 0.67 and 0.33 < (cy / 500) < 0.67:
            conclusions.append(
                "○ Centroide fluorescente localizado en región central de la imagen."
            )
        else:
            conclusions.append(
                "Nota: Centroide fluorescente desplazado hacia bordes. Posible distribución "
                "no uniforme o efecto de borde."
            )

    return conclusions


def interpret_model_metrics(model_metrics: dict) -> list[str]:
    """
    Analiza métricas del modelo Beer-Lambert y genera conclusiones.

    Parámetros:
        model_metrics (dict): Dict con keys: r2, rmse, mae, slope, equation

    Retorna:
        list[str]: Lista de conclusiones sobre ajuste del modelo
    """
    conclusions = []

    r2 = model_metrics.get("r2", 0.0)
    rmse = model_metrics.get("rmse", 0.0)
    mae = model_metrics.get("mae", 0.0)
    slope = model_metrics.get("slope", 0.0)
    equation = model_metrics.get("equation", "")

    # Si no hay calibración
    if "No se proporcionaron" in str(equation):
        conclusions.append(
            "Nota: No se proporcionaron datos de calibración. El modelo Beer-Lambert no pudo "
            "ajustarse. Proporcione concentraciones e intensidades para análisis cuantitativos."
        )
        return conclusions

    # Análisis de ajuste (R²)
    if r2 >= R2_EXCELENTE:
        conclusions.append(
            f"Ajuste excelente del modelo Beer-Lambert (R² = {r2:.4f}). Los datos experimentales "
            "se ajustan muy bien a la ley de absorción lineal."
        )
    elif r2 >= R2_BUENO:
        conclusions.append(
            f"Ajuste bueno del modelo (R² = {r2:.4f}). La ley de Beer-Lambert es apropiada "
            "para estos datos con desviaciones menores."
        )
    elif r2 >= R2_POBRE:
        conclusions.append(
            f"○ Ajuste aceptable (R² = {r2:.4f}). Existen desviaciones moderadas de la idealidad, "
            "comunes en sistemas biológicos complejos."
        )
    else:
        conclusions.append(
            f"Advertencia: Ajuste pobre (R² = {r2:.4f}). La ley de Beer-Lambert no es adecuada. "
            "Posible presencia de autoabsorción, quenching, o efectos no lineales."
        )

    # Análisis de error residual (RMSE)
    if rmse <= RMSE_BAJO:
        conclusions.append(
            f"Error residual bajo (RMSE = {rmse:.4f}). Predicciones del modelo "
            "muy precisas y confiables."
        )
    elif rmse <= RMSE_MEDIO:
        conclusions.append(
            f"○ Error residual moderado (RMSE = {rmse:.4f}). Precisión aceptable para "
            "aplicaciones científicas estándar."
        )
    else:
        conclusions.append(
            f"Advertencia: Error residual elevado (RMSE = {rmse:.4f}). Existen discrepancias significativas "
            "entre predicciones y valores experimentales."
        )

    # Análisis de error medio absoluto (MAE)
    if mae <= MAE_BAJO:
        conclusions.append(
            f"Error medio bajo (MAE = {mae:.4f}). Modelo muy preciso para estimaciones."
        )
    elif mae > MAE_ALTO:
        conclusions.append(
            f"Advertencia: Error medio alto (MAE = {mae:.4f}). Verifique condiciones experimentales "
                "y posible presencia de artefactos."
        )

    # Análisis de pendiente
    if slope > 0:
        if slope > 10:
            conclusions.append(
                f"Nota: Pendiente Beer-Lambert elevada (m = {slope:.4f}). Sistema muy sensible a "
                "cambios de concentración."
            )
        elif slope < 1:
            conclusions.append(
                f"Nota: Pendiente Beer-Lambert baja (m = {slope:.4f}). Sistema poco sensible o "
                "con rango dinámico limitado."
            )
    else:
        conclusions.append(
            "Advertencia: Pendiente no positiva. Posible error en calibración o en los datos."
        )

    return conclusions


def generate_general_conclusion(
    intensity_stats: dict,
    spatial_stats: dict,
    model_metrics: dict,
) -> str:
    """
    Genera una conclusión general coherente basada en todos los análisis.

    Parámetros:
        intensity_stats (dict): Estadísticas de intensidad
        spatial_stats (dict): Estadísticas espaciales
        model_metrics (dict): Métricas del modelo

    Retorna:
        str: Conclusión científica general
    """
    mean_intensity = intensity_stats.get("mean", 0.0)
    uniformity = spatial_stats.get("uniformity", 0.0)
    fluorescent_percentage = spatial_stats.get("fluorescent_percentage", 0.0)
    r2 = model_metrics.get("r2", 0.0)

    # Casos especiales
    if fluorescent_percentage < 1:
        return (
            "La muestra no muestra fluorescencia detectable. Verifique que el fluoróforo "
            "está presente y que el equipo de visualización es funcional."
        )

    if mean_intensity > INTENSIDAD_SATURACION:
        return (
            "Advertencia: ESTADO CRÍTICO: Saturación fluorescente detectada. El sistema está en el "
            "rango de no-linealidad. Reduzca concentración, tiempo de exposición o voltaje "
            "de detección para obtener medidas cuantitativas válidas."
        )

    # Construcción de conclusión basada en el estado general
    parts = []

    # Intensidad
    if mean_intensity >= INTENSIDAD_ALTA:
        parts.append("carga fluorescente elevada")
    elif mean_intensity >= INTENSIDAD_MEDIA:
        parts.append("fluorescencia moderada")
    else:
        parts.append("fluorescencia débil")

    # Uniformidad
    if uniformity >= UNIFORMIDAD_ALTA:
        parts.append("distribución homogénea")
    elif uniformity >= UNIFORMIDAD_MEDIA:
        parts.append("distribución heterogénea")
    else:
        parts.append("distribución muy dispersa")

    # Cobertura
    if fluorescent_percentage >= PORCENTAJE_ALTO:
        parts.append("cobertura espacial extensa")
    elif fluorescent_percentage >= PORCENTAJE_MEDIO:
        parts.append("cobertura espacial moderada")
    else:
        parts.append("cobertura espacial limitada")

    conclusion = f"Muestra con {', '.join(parts)}. "

    if conclusion.strip() == "Muestra con fluorescencia débil, distribución homogénea, cobertura espacial limitada." :
        return (
            "Muestra con fluorescencia detectable y distribución homogénea, aunque con cobertura espacial moderada. "
            "Los resultados obtenidos representan una base prometedora, y se recomienda complementarlos con validación experimental "
            "y técnicas adicionales para fortalecer la confirmación y el alcance del análisis."
        )

    # Recomendación basada en Beer-Lambert
    if r2 > 0.0 and r2 < R2_POBRE:
        conclusion += (
            "El modelo Beer-Lambert no es adecuado para esta muestra, sugiriendo presencia "
            "de efectos no lineales o compleja composición. "
        )
    elif r2 >= R2_EXCELENTE:
        conclusion += (
            "Datos de excelente calidad, apropiados para análisis cuantitativos de concentración. "
        )

    conclusion += (
        "Se recomienda validación experimental y comparación con técnicas complementarias "
        "para confirmación de resultados."
    )

    return conclusion


def interpret_results(results_data: dict) -> dict:
    """
    Función consolidada que interpreta todos los resultados y retorna
    un dict con todas las conclusiones organizadas.

    Parámetros:
        results_data (dict): Dict devuelto por el endpoint /results con:
                            - intensity_stats
                            - spatial_stats
                            - model_metrics

    Retorna:
        dict: Dict con estructura:
              {
                  "intensity_analysis": [conclusiones],
                  "spatial_analysis": [conclusiones],
                  "model_analysis": [conclusiones],
                  "general_conclusion": str
              }
    """
    intensity_stats = results_data.get("intensity_stats", {})
    spatial_stats = results_data.get("spatial_stats", {})
    model_metrics = results_data.get("model_metrics", {})

    return {
        "intensity_analysis": interpret_intensity_stats(intensity_stats),
        "spatial_analysis": interpret_spatial_stats(spatial_stats),
        "model_analysis": interpret_model_metrics(model_metrics),
        "general_conclusion": generate_general_conclusion(
            intensity_stats,
            spatial_stats,
            model_metrics,
        ),
    }


# ── DEBUG / TESTING ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Caso de prueba: muestra con saturación y distribución heterogénea
    test_results = {
        "intensity_stats": {
            "mean": 0.98,
            "median": 0.95,
            "max": 1.0,
            "min": 0.5,
            "std": 0.15,
            "variance": 0.0225,
            "percentile_95": 0.99,
        },
        "spatial_stats": {
            "fluorescent_area": 50000,
            "fluorescent_percentage": 55.0,
            "centroid": {"x": 250, "y": 250},
            "uniformity": 0.55,
        },
        "model_metrics": {
            "r2": 0.92,
            "rmse": 0.08,
            "mae": 0.06,
            "slope": 2.5,
            "equation": "I = 2.5 * [C] + 0.1",
        },
    }

    interpretation = interpret_results(test_results)
    print("\n=== INTERPRETACIÓN DE RESULTADOS ===\n")
    print("Análisis de Intensidad:")
    for line in interpretation["intensity_analysis"]:
        print(f"  {line}")
    print("\nAnálisis Espacial:")
    for line in interpretation["spatial_analysis"]:
        print(f"  {line}")
    print("\nAnálisis del Modelo:")
    for line in interpretation["model_analysis"]:
        print(f"  {line}")
    print("\nConclusión General:")
    print(f"  {interpretation['general_conclusion']}")
