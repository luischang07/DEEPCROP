# API de Procesamiento de Imágenes Satelitales

API REST para el cálculo automático de índices de vegetación y estrés hídrico a partir de imágenes satelitales.

## 📋 Características

- Cálculo de múltiples índices de vegetación:
  - **NDVI** (Normalized Difference Vegetation Index) - Salud de la vegetación
  - **NDWI** (Normalized Difference Water Index) - Contenido de agua
  - **MSI** (Moisture Stress Index) - Estrés hídrico

- Detección automática del número de bandas espectrales
- Generación automática de mapas de color
- API REST fácil de integrar
- Soporte para múltiples formatos de imagen (TIFF, JP2, PNG)
- Compatible con imágenes RGB (3 bandas), RGB-NIR (4 bandas) y multiespectrales (5+ bandas)

## 🚀 Instalación

### 1. Clonar/Crear el proyecto

```bash
mkdir satellite-api
cd satellite-api
```

### 2. Crear entorno virtual

```bash
python3 -m venv venv

# En Mac/Linux:
source venv/bin/activate

# En Windows:
venv\Scripts\activate
```

### 3. Instalar GDAL (Mac)

```bash
# Instalar Homebrew si no lo tienes
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar GDAL
brew install gdal
```

### 4. Instalar dependencias de Python

```bash
pip install -r requirements.txt
```

### 5. Crear estructura de directorios

Los directorios se crean automáticamente al iniciar la aplicación, pero puedes crearlos manualmente:

```bash
mkdir uploads outputs public/images
```

## 📁 Estructura del Proyecto

```
satellite-api/
├── app/
│   ├── __init__.py              # Inicialización de Flask
│   ├── routes.py                # Endpoints de la API
│   ├── processors/
│   │   ├── __init__.py
│   │   └── indices.py           # Lógica de cálculo de índices
│   └── utils/
│       ├── __init__.py
│       └── validators.py        # Validaciones
├── public/
│   └── images/                  # Imágenes para procesar
├── uploads/                     # Imágenes subidas (temporal)
├── outputs/                     # Imágenes procesadas (PNG)
├── requirements.txt             # Dependencias
├── config.py                    # Configuración
├── run.py                       # Punto de entrada
├── test_api.py                  # Script de pruebas
├── combine_bands.py             # Script para combinar bandas
├── reduce_image.py              # Script para reducir tamaño
├── .env                         # Variables de entorno (crear)
├── .env.example                 # Plantilla de variables
├── .gitignore                   # Archivos a ignorar en Git
├── Dockerfile                   # Configuración de Docker
├── docker-compose.yml           # Orquestación de Docker
└── README.md                    # Este archivo
```

## 🎯 Uso

### Iniciar el servidor

```bash
python run.py
```

El servidor se iniciará en `http://localhost:5001` (puerto 5001 para evitar conflictos con AirPlay en Mac)

### Endpoints Disponibles

#### 1. Health Check
```bash
GET /health
```

Verifica que la API está funcionando.

**Respuesta:**
```json
{
  "status": "ok",
  "message": "Satellite API is running"
}
```

#### 2. Índices Disponibles
```bash
GET /indices
```

Lista todos los índices disponibles y su descripción.

**Respuesta:**
```json
{
  "status": "success",
  "available_indices": {
    "ndvi": {
      "name": "NDVI",
      "full_name": "Normalized Difference Vegetation Index",
      "description": "Indica la salud y vigor de la vegetación",
      "range": [-1, 1],
      "interpretation": { ... }
    },
    ...
  }
}
```

#### 3. Procesar Imagen
```bash
POST /process
```

**Parámetros:**
- `file` (required): Archivo de imagen satelital
- `band_config` (optional): Configuración JSON de bandas

**Ejemplo con cURL:**
```bash
curl -X POST http://localhost:5001/process \
  -F "file=@imagen_satelital.tif"
```

**Ejemplo con Python:**
```python
import requests

files = {'file': open('imagen_satelital.tif', 'rb')}
response = requests.post('http://localhost:5001/process', files=files)
print(response.json())
```

**Respuesta exitosa:**
```json
{
  "status": "success",
  "message": "Image processed successfully",
  "original_filename": "imagen_satelital.tif",
  "results": {
    "ndvi": {
      "path": "outputs/imagen_satelital_NDVI.png",
      "mean": 0.45,
      "min": -0.12,
      "max": 0.89
    },
    "ndwi": {
      "path": "outputs/imagen_satelital_NDWI.png",
      "mean": 0.32,
      "min": -0.25,
      "max": 0.78
    },
    "msi": {
      "path": "outputs/imagen_satelital_MSI.png",
      "mean": 1.2,
      "min": 0.5,
      "max": 2.8
    }
  }
}
```

**Respuesta con imágenes de 3 bandas (RGB):**
```json
{
  "status": "success",
  "message": "Image processed successfully",
  "results": {
    "ndvi": {
      "path": "outputs/imagen_NDVI.png",
      "mean": 0.15,
      "min": -0.5,
      "max": 0.6
    },
    "ndwi": {
      "error": "Requiere banda SWIR (mínimo 5 bandas)",
      "skipped": true
    },
    "msi": {
      "error": "Requiere banda SWIR (mínimo 5 bandas)",
      "skipped": true
    }
  }
}
```

#### 4. Descargar Resultado
```bash
GET /download/<index_type>/<filename>
```

Descarga la imagen procesada.

**Ejemplo:**
```bash
curl http://localhost:5001/download/ndvi/imagen_NDVI.png --output resultado.png
```

## 🎨 Configuración de Bandas

La API **detecta automáticamente** el número de bandas y ajusta el procesamiento:

### Imágenes de 3 bandas (RGB)
- Solo calcula **NDVI** (aproximación)
- NDWI y MSI requieren bandas adicionales

### Imágenes de 4 bandas (RGB + NIR)
- Calcula **NDVI** correctamente
- NDWI y MSI con aproximaciones

### Imágenes de 5+ bandas (Multiespectral)
- Calcula **todos los índices** (NDVI, NDWI, MSI)
- Configuración por defecto para Sentinel-2

### Configuración Manual

Si tu imagen tiene bandas en diferente orden, puedes especificarlo:

**En Python:**
```python
import requests
import json

band_config = {
    'nir': 4,
    'red': 3,
    'green': 2,
    'blue': 1,
    'swir': 5
}

files = {'file': open('imagen.tif', 'rb')}
data = {'band_config': json.dumps(band_config)}

response = requests.post('http://localhost:5001/process', 
                        files=files, 
                        data=data)
```

**En Postman:**
- Body → form-data
- KEY: `band_config`, TYPE: Text
- VALUE: `{"nir": 4, "red": 3, "green": 2, "blue": 1, "swir": 5}`

## 📊 Interpretación de Índices

### NDVI (Normalized Difference Vegetation Index)
Mide la salud y vigor de la vegetación.

**Rango:** -1 a 1

| Valor | Interpretación |
|-------|----------------|
| < 0 | Agua, nubes, nieve |
| 0 - 0.2 | Suelo desnudo, rocas |
| 0.2 - 0.5 | Vegetación escasa o estresada |
| 0.5 - 0.8 | Vegetación saludable |
| 0.8 - 1 | Vegetación muy densa y saludable |

**Colores:** Rojo (bajo) → Amarillo (medio) → Verde (alto)

### NDWI (Normalized Difference Water Index)
Detecta el contenido de agua en la vegetación.

**Rango:** -1 a 1

- **Valores bajos:** Estrés hídrico severo
- **Valores medios:** Estrés hídrico moderado
- **Valores altos:** Buena disponibilidad de agua

**Colores:** Rojo (seco) → Amarillo (medio) → Azul (húmedo)

### MSI (Moisture Stress Index)
Indicador directo de estrés hídrico.

**Rango:** 0 a 3+

- **< 1:** Sin estrés hídrico
- **1 - 2:** Estrés moderado
- **> 2:** Estrés severo

**Colores:** Verde (sin estrés) → Amarillo (medio) → Rojo (estrés severo)

## 🧪 Probar la API

### Con el script de pruebas

```bash
python test_api.py
```

Esto procesará **automáticamente todas** las imágenes en `public/images/` y mostrará un resumen.

### Con Postman

1. **Health Check:**
   - Método: GET
   - URL: `http://localhost:5001/health`

2. **Procesar imagen:**
   - Método: POST
   - URL: `http://localhost:5001/process`
   - Body → form-data
   - KEY: `file`, TYPE: File, VALUE: Selecciona tu imagen .tif

3. **Ver resultado:**
   - Método: GET
   - URL: `http://localhost:5001/download/ndvi/nombre_imagen_NDVI.png`

## 🌐 Integración con Frontend

### Ejemplo con JavaScript (Fetch API)

```javascript
async function processImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('http://localhost:5001/process', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('Procesamiento exitoso:', result);
      
      // Mostrar imagen NDVI
      if (result.results.ndvi && result.results.ndvi.path) {
        const ndviUrl = `http://localhost:5001/download/ndvi/${result.results.ndvi.path.split('/').pop()}`;
        document.getElementById('ndvi-img').src = ndviUrl;
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Ejemplo con Axios

```javascript
import axios from 'axios';

async function processImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await axios.post('http://localhost:5001/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error procesando imagen:', error);
    throw error;
  }
}
```

## 🔧 Configuración Avanzada

### Cambiar Puerto

Edita `run.py`:

```python
app.run(debug=True, host='0.0.0.0', port=8080, use_reloader=False, threaded=True)
```

### Aumentar Tamaño Máximo de Archivo

Edita `config.py`:

```python
MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB
```

### Modo Producción

Para producción, usa un servidor WSGI como Gunicorn:

```bash
pip install gunicorn

gunicorn -w 4 -b 0.0.0.0:5001 --timeout 300 run:app
```

### Usando Docker

```bash
# Construir imagen
docker-compose build

# Iniciar servicios
docker-compose up

# En segundo plano
docker-compose up -d
```

## 📝 Formatos de Imagen Soportados

- **TIFF/GeoTIFF** (.tif, .tiff) - Recomendado para imágenes satelitales
- **JPEG 2000** (.jp2) - Usado por Sentinel-2
- **PNG** (.png) - Para pruebas

## 🛠️ Scripts Auxiliares

### combine_bands.py
Combina bandas individuales de Sentinel-2 en una sola imagen multiespectral.

```bash
python combine_bands.py
```

### reduce_image.py
Reduce el tamaño de una imagen para pruebas más rápidas.

```bash
python reduce_image.py
```

## ⚠️ Notas Importantes

1. **Bandas espectrales:** 
   - Imágenes RGB (3 bandas): Solo NDVI disponible
   - Imágenes RGB-NIR (4 bandas): NDVI + aproximaciones
   - Imágenes multiespectrales (5+ bandas): Todos los índices

2. **Orden de bandas:** Por defecto se asume Sentinel-2. Para otros satélites (Landsat, etc.), usa `band_config`.

3. **Memoria:** Las imágenes grandes pueden consumir mucha RAM. Considera reducir el tamaño o procesamiento por tiles.

4. **Archivos temporales:** Los archivos subidos se guardan en `uploads/`. Considera implementar limpieza automática.

5. **Puerto en Mac:** El puerto 5000 está ocupado por AirPlay Receiver. Usa 5001 o desactiva AirPlay en Preferencias del Sistema.

## 🐛 Solución de Problemas

### Error: "index X is out of bounds for axis 0 with size Y"

Tu imagen tiene menos bandas de las esperadas. La API ahora detecta esto automáticamente y adapta el procesamiento.

### Error: "rasterio not found" o problemas con GDAL

**En Mac:**
```bash
brew install gdal
pip install rasterio
```

**En Windows:**
```bash
pip install pipwin
pipwin install gdal
pipwin install rasterio
```

**En Linux:**
```bash
sudo apt-get install gdal-bin libgdal-dev
pip install rasterio
```

### Error: "No module named 'app'"

Asegúrate de estar en el directorio raíz del proyecto y que todos los `__init__.py` existan.

### Error: "Port 5001 is in use"

Cambia el puerto en `run.py` o mata el proceso:
```bash
# Ver qué está usando el puerto
lsof -i :5001

# Matar el proceso
kill -9 PID
```

### El servidor no muestra nada al iniciar

Es normal en Flask. Verás los logs cuando hagas peticiones. Para más verbosidad:
```bash
python -u run.py
```

### Las imágenes no se guardan en outputs/

Verifica que la carpeta existe y tiene permisos:
```bash
mkdir -p outputs
chmod 777 outputs
```

## 📚 Recursos Adicionales

- [Documentación de Rasterio](https://rasterio.readthedocs.io/)
- [Guía de índices de vegetación](https://www.indexdatabase.de/)
- [Sentinel-2 Bandas](https://sentinels.copernicus.eu/web/sentinel/user-guides/sentinel-2-msi/resolutions/radiometric)
- [Copernicus Open Access Hub](https://scihub.copernicus.eu/) - Descargar imágenes Sentinel

## 🤝 Contribuciones

Mejoras sugeridas:
- Agregar más índices (EVI, SAVI, GNDVI, etc.)
- Implementar procesamiento asíncrono con Celery
- Cache de resultados con Redis
- Autenticación JWT
- Rate limiting
- Exportar resultados en formato GeoTIFF georeferenciado
- Procesamiento por tiles para imágenes muy grandes
- Webhooks para notificar cuando termine el procesamiento

## 📄 Licencia

Este proyecto es de código abierto.

## 👨‍💻 Autor

Desarrollado para el procesamiento automatizado de imágenes satelitales y análisis de cultivos.