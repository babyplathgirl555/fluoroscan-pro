# FluoroScan Pro v3.0
### Análisis de fluorescencia biomédica · React + FastAPI

---

## Estructura del proyecto

```
fluoroscan/
├── backend/
│   ├── main.py            ← FastAPI API
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── lib/
        │   └── api.js         ← cliente HTTP
        └── components/
            ├── ui.jsx          ← primitivos (Card, Btn, Input, Pill…)
            ├── Sidebar.jsx
            ├── Header.jsx
            ├── LoadSection.jsx
            ├── TableSection.jsx
            └── AnalyzeSection.jsx
```

---

## 1. Backend (FastAPI)

### Instalación
```bash
cd backend
pip install -r requirements.txt
```

### Conectar tu lógica existente
Abre `backend/main.py` y reemplaza las dos funciones stub:

```python
# Línea ~18 — reemplaza _analizar_imagen_stub:
from procesamiento import analizar_imagen

# Línea ~32 — reemplaza _analizar_datos_stub:
from analisis import analizar_datos
```

Luego en los endpoints usa las funciones reales:
```python
# En process_image:
intensidad, *_ = analizar_imagen(tmp_path)

# En analyze:
result = analizar_datos(req.concentraciones, req.intensidades)
# adapta el return para que sea un dict con las mismas keys
```

### Arrancar
```bash
uvicorn main:app --reload --port 8000
```

Swagger UI disponible en: http://localhost:8000/docs

---

## 2. Frontend (React + Vite)

### Instalación
```bash
cd frontend
npm install
```

### Desarrollo
```bash
npm run dev
# Abre http://localhost:5173
```

El proxy de Vite redirige `/api/*` → `http://localhost:8000` automáticamente.

### Build para producción
```bash
npm run build
# Salida en frontend/dist/
```

---

## 3. Endpoints API

| Método | Ruta                 | Descripción                              |
|--------|----------------------|------------------------------------------|
| GET    | `/health`            | Estado de la API                         |
| POST   | `/api/process-image` | Procesa una imagen → devuelve intensidad |
| POST   | `/api/analyze`       | Ajuste del modelo → curva + parámetros   |

### POST /api/process-image
```
Content-Type: multipart/form-data
file: <imagen.jpg>

→ { filename, intensidad, ok, error? }
```

### POST /api/analyze
```json
{
  "imagenes":        ["img1.jpg", "img2.jpg"],
  "concentraciones": [0.1, 0.5, 1.0, 2.0],
  "intensidades":    [850.2, 640.1, 420.5, 210.3]
}

→ {
    "concentracion_optima": 0.0842,
    "intensidad_maxima":    901.4,
    "curva":  { "x": [...], "y": [...] },
    "puntos": { "x": [...], "y": [...] },
    "ajuste_exitoso": true,
    "parametros":    [a, b, c],
    "incertidumbres":[da, db, dc]
  }
```

---

## 4. Paleta de diseño

| Token            | Valor     | Uso                       |
|------------------|-----------|---------------------------|
| `--rose-500`     | `#E0286F` | Acento principal          |
| `--rose-50`      | `#FFF0F6` | Fondos suaves             |
| `--bg-page`      | `#FDF5F8` | Fondo de página           |
| `--text-heading` | `#18060E` | Títulos (Playfair Display)|
| `--text-body`    | `#3D1530` | Cuerpo (DM Sans)          |
| `--sb-bg`        | `#1E0812` | Sidebar                   |

---

## 5. Tipografía

- **Playfair Display** — títulos, métricas, números clave
- **DM Sans** — UI, cuerpo, labels, botones

Ambas se cargan desde Google Fonts en `index.html`.
