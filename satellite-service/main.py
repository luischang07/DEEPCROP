from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
import ee
import json
import os
import logging
from datetime import datetime
from PIL import Image
# import cv2  # Comentado temporalmente para solo usar Pillow
import numpy as np
import io

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Satellite Image Service",
    description="Microservicio para búsqueda y descarga de imágenes satelitales usando Google Earth Engine",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class SearchRequest(BaseModel):
    bounds: List[List[float]]  # Array de coordenadas del bounding box [[lng, lat], [lng, lat], ...]
    date_start: str
    date_end: str
    max_cloud_cover: Optional[float] = 100.0
    collection: Optional[str] = "COPERNICUS/S2_SR_HARMONIZED"

class DownloadRequest(BaseModel):
    image_id: str
    bands: Optional[List[str]] = ["B4", "B3", "B2"]  # RGB por defecto
    scale: Optional[float] = 30.0
    region: Optional[List[List[List[float]]]] = None
    max_file_size_mb: Optional[float] = 45.0  # Límite de tamaño en MB
    enhance_visualization: Optional[bool] = True  # Mejorar visualización
    visualization_params: Optional[dict] = None  # Parámetros de visualización personalizados

class SatelliteImage(BaseModel):
    id: str
    full_id: str
    date: str
    cloud_coverage: float
    bands: List[str]
    product_id: str
    spacecraft: str
    orbit: int

class DownloadResponse(BaseModel):
    download_url: str
    status: str
    image_id: str
    bands: List[str]
    scale: float

class SearchPlanetRequest(BaseModel):
    geometry: Optional[Union[Dict[str, Any], List[Any]]] = None
    date_start: str
    date_end: str
    item_types: Optional[List[str]] = ["PSScene"]
    max_cloud_cover: Optional[float] = 100.0
    api_key: str

class OrderPlanetRequest(BaseModel):
    name: str
    item_ids: List[str]
    item_type: str = "PSScene"
    bundle: str = "analytic_8b_sr_udm2"
    geometry: Optional[Union[Dict[str, Any], List[Any]]] = None
    api_key: str

# Helper para autenticación de Planet
def get_planet_auth(api_key: str):
    import requests
    from requests.auth import HTTPBasicAuth
    return HTTPBasicAuth(api_key, "")

# Inicializar Google Earth Engine
def initialize_ee():
    try:
        # Ruta al archivo de credenciales
        credentials_path = "/app/credentials/gee_service_account.json"
        if not os.path.exists(credentials_path):
            credentials_path = "../gee_service_account.json"
        
        if os.path.exists(credentials_path):
            credentials = ee.ServiceAccountCredentials(
                email=None,
                key_file=credentials_path
            )
            ee.Initialize(credentials)
            logger.info("Google Earth Engine inicializado correctamente")
        else:
            logger.warning("Archivo de credenciales no encontrado, intentando inicialización por defecto")
            ee.Initialize()
    except Exception as e:
        logger.error(f"Error inicializando Google Earth Engine: {str(e)}")
        raise

@app.on_event("startup")
async def startup_event():
    initialize_ee()

@app.get("/")
async def root():
    return {
        "message": "Satellite Image Service",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "search": "/search",
            "download": "/download",
            "bands": "/bands",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    try:
        # Test básico de Earth Engine
        ee.Number(1).getInfo()
        return {"status": "healthy", "earth_engine": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.post("/search", response_model=List[SatelliteImage])
async def search_images(request: SearchRequest):
    try:
        logger.info(f"Buscando imágenes desde {request.date_start} hasta {request.date_end}")
        
        # Crear geometría desde las coordenadas del bounding box
        # bounds viene como [[lng, lat], [lng, lat], [lng, lat], [lng, lat]]
        geometry = ee.Geometry.Polygon([request.bounds])
        
        # Crear colección de imágenes
        # Propiedad de nubes cambia según la colección
        cloud_prop = 'CLOUD_COVER' if 'LANDSAT' in request.collection else 'CLOUDY_PIXEL_PERCENTAGE'
        
        collection = ee.ImageCollection(request.collection) \
            .filterBounds(geometry) \
            .filterDate(request.date_start, request.date_end) \
            .filter(ee.Filter.lt(cloud_prop, request.max_cloud_cover)) \
            .sort(cloud_prop)
        
        # Obtener información de las imágenes
        images_info = collection.limit(50).getInfo()
        
        results = []
        for img in images_info['features']:
            properties = img['properties']
            
            # Bandas típicas dependiendo de la colección
            if "LANDSAT" in request.collection:
                default_bands = ["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7", "ST_B10"]
            else:
                default_bands = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B9", "B10", "B11", "B12"]

            # Extraer información de la imagen
            image_data = SatelliteImage(
                id=properties.get('PRODUCT_ID', '').split('_')[-1] if 'PRODUCT_ID' in properties else img['id'],
                full_id=img['id'],
                date=properties.get('PRODUCT_ID', '').split('_')[2][:8] if 'PRODUCT_ID' in properties else properties.get('DATE_ACQUIRED', ''),
                cloud_coverage=properties.get('CLOUDY_PIXEL_PERCENTAGE', properties.get('CLOUD_COVER', 0)),
                bands=default_bands,
                product_id=properties.get('PRODUCT_ID', properties.get('LANDSAT_PRODUCT_ID', '')),
                spacecraft=properties.get('SPACECRAFT_ID', properties.get('SPACECRAFT_ID', 'Landsat') if "LANDSAT" in request.collection else ''),
                orbit=properties.get('SENSING_ORBIT_NUMBER', properties.get('WRS_PATH', 0))
            )
            
            # Formatear fecha
            if len(image_data.date) == 8:
                try:
                    date_obj = datetime.strptime(image_data.date, '%Y%m%d')
                    image_data.date = date_obj.strftime('%Y-%m-%d')
                except:
                    pass
            
            results.append(image_data)
        
        logger.info(f"Encontradas {len(results)} imágenes")
        return results
    
    except Exception as e:
        logger.error(f"Error en búsqueda: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error buscando imágenes: {str(e)}")

@app.post("/download", response_model=DownloadResponse)
async def download_image(request: DownloadRequest):
    try:
        logger.info(f"Generando URL de descarga para imagen: {request.image_id}")
        
        # Obtener la imagen
        image = ee.Image(request.image_id)
        
        # Definir región si se proporciona
        region = None
        if request.region:
            if len(request.region) == 1:
                region = ee.Geometry.Polygon(request.region[0])
            else:
                geometries = [ee.Geometry.Polygon(coords) for coords in request.region]
                region = ee.Geometry.MultiPolygon(geometries)
            
            # Recortar la imagen al área de interés (AOI)
            image = image.clip(region)
            logger.info("Imagen recortada a la región proporcionada")

        # Caso especial: Descarga de todas las bandas (Si se solicita "ALL" o una lista vacía de bandas, pero en la práctica el frontend pedirá específicas)
        # Si el usuario pide una lista de bandas (ej: [B4, B3, B2, B8]), las seleccionamos
        if request.bands:
            # Si se pide una banda especial "ALL", seleccionamos todas las disponibles
            if "ALL" in [b.upper() for b in request.bands]:
                logger.info("Se solicitan todas las bandas disponibles")
                # No hacemos select, nos quedamos con todas
            else:
                # Adaptar bandas por defecto si es Landsat
                if request.bands == ["B4", "B3", "B2"] and "LANDSAT" in request.image_id:
                    request.bands = ["SR_B4", "SR_B3", "SR_B2"]
                    logger.info("Bandas ajustadas automáticamente para RGB en Landsat: SR_B4, SR_B3, SR_B2")
                
                image = image.select(request.bands)
        
        # --- Lógica de Visualización vs Datos Crudos ---
        # Solo aplicamos .visualize() si:
        # 1. enhance_visualization es True Y
        # 2. Se solicitan 3 bandas o menos (típico para RGB o Infrarrojo color)
        # Si se solicitan más de 3 bandas, es probable que se quiera análisis, así que NO visualizamos.
        
        is_all_bands = any(b.upper() == "ALL" for b in request.bands) if request.bands else False
        num_bands = len(request.bands) if request.bands else 0
        should_visualize = request.enhance_visualization and num_bands > 0 and num_bands <= 3 and not is_all_bands

        if should_visualize:
            if "COPERNICUS/S2" in request.image_id:
                logger.info("Aplicando mejoras de visualización para Sentinel-2")
                
                # Los valores típicos para visualización RGB están entre 0-3000
                if request.bands == ["B4", "B3", "B2"]:  # RGB Natural
                    image = image.visualize(min=0, max=3000, bands=request.bands)
                    logger.info("Aplicada visualización RGB natural (B4,B3,B2)")
                elif request.bands == ["B8", "B4", "B3"]:  # False color
                    image = image.visualize(min=0, max=3000, bands=request.bands)
                    logger.info("Aplicada visualización falso color (B8,B4,B3)")
                else:
                    image = image.visualize(min=0, max=3000, bands=request.bands)
                    logger.info(f"Aplicada visualización genérica para bandas: {request.bands}")
                    
            elif "LANDSAT" in request.image_id:
                logger.info("Aplicando mejoras de visualización para Landsat 8/9")
                image = image.visualize(min=7000, max=16000, bands=request.bands)
                logger.info(f"Aplicada visualización Landsat para bandas: {request.bands}")
                    
            elif request.visualization_params:
                logger.info("Aplicando parámetros de visualización personalizados")
                min_val = request.visualization_params.get('min', 0)
                max_val = request.visualization_params.get('max', 3000)
                image = image.visualize(min=min_val, max=max_val, bands=request.bands)
        else:
            logger.info(f"Generando descarga de datos crudos (num_bands: {num_bands}, enhance: {request.enhance_visualization})")
        
        # Estrategia de escalado
        scale = request.scale
        max_attempts = 5
        attempt = 0
        
        while attempt < max_attempts:
            try:
                url_params = {
                    'scale': scale,
                    'format': 'GeoTIFF',
                    'filePerBand': False
                }
                
                if region:
                    url_params['region'] = region
                
                logger.info(f"Intento {attempt + 1}: Generando URL con escala {scale}m")
                download_url = image.getDownloadURL(url_params)
                
                return DownloadResponse(
                    download_url=download_url,
                    status="success",
                    image_id=request.image_id,
                    bands=request.bands or [],
                    scale=scale
                )
                
            except Exception as e:
                error_msg = str(e)
                if "Total request size" in error_msg and "must be less than or equal to" in error_msg:
                    scale = scale * 1.5
                    attempt += 1
                    logger.warning(f"Tamaño excedido. Reintentando con escala {scale}m")
                    if attempt >= max_attempts:
                        scale = 100.0
                        download_url = image.getDownloadURL({**url_params, 'scale': scale})
                        return DownloadResponse(
                            download_url=download_url, status="success",
                            image_id=request.image_id, bands=request.bands or [], scale=scale
                        )
                else:
                    raise e
        
        raise Exception("No se pudo generar URL de descarga después de varios intentos")
    
    except Exception as e:
        logger.error(f"Error generando URL de descarga: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generando URL de descarga: {str(e)}")

@app.get("/bands/{collection_name}")
async def get_available_bands(collection_name: str):
    try:
        # Obtener una imagen de muestra para obtener las bandas disponibles
        collection = ee.ImageCollection(collection_name).first()
        bands_info = collection.getInfo()
        
        if 'bands' in bands_info:
            bands = [band['id'] for band in bands_info['bands']]
            return {
                "collection": collection_name,
                "bands": bands,
                "total_bands": len(bands)
            }
        else:
            return {
                "collection": collection_name,
                "bands": [],
                "total_bands": 0,
                "error": "No se pudieron obtener las bandas"
            }
    
    except Exception as e:
        logger.error(f"Error obteniendo bandas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo bandas: {str(e)}")

# --- Endpoints de Planet API ---

@app.post("/planet/search")
async def search_planet_images(request: SearchPlanetRequest):
    import requests
    try:
        logger.info(f"Buscando imágenes en Planet para el periodo {request.date_start} a {request.date_end}")
        
        # Formatear la geometría para Planet API (GeoJSON)
        # Frontend envía list de [lat, lng]. Planet espera Polygon con [[[lon, lat], ...]]]
        planet_geom = request.geometry
        
        # Si es un dict (GeoJSON format completo)
        if isinstance(planet_geom, dict) and "type" in planet_geom and planet_geom["type"].lower() == "polygon":
             pass # Ya está bien formado
        # Si es una lista, Laravel nos asegura que es un array de pares [lng, lat]
        elif isinstance(planet_geom, list):
             # Por seguridad, si el primer elemento no es una lista, algo está mal
             if len(planet_geom) > 0 and isinstance(planet_geom[0], list):
                 # Envolver en un array adicional para cumplir con la especificación Polygon
                 planet_geom = {
                    "type": "Polygon",
                    "coordinates": [planet_geom]
                 }
        
        # Construir filtro de búsqueda de Planet
        search_filter = {
            "type": "AndFilter",
            "config": [
                {
                    "type": "GeometryFilter",
                    "field_name": "geometry",
                    "config": planet_geom
                },
                {
                    "type": "DateRangeFilter",
                    "field_name": "acquired",
                    "config": {
                        "gte": f"{request.date_start}T00:00:00Z",
                        "lte": f"{request.date_end}T23:59:59Z"
                    }
                },
                {
                    "type": "RangeFilter",
                    "field_name": "cloud_cover",
                    "config": {
                        "lte": request.max_cloud_cover / 100.0
                    }
                }
            ]
        }
        
        payload = {
            "item_types": request.item_types,
            "filter": search_filter
        }
        
        auth = get_planet_auth(request.api_key)
        response = requests.post(
            "https://api.planet.com/data/v1/quick-search",
            auth=auth,
            json=payload
        )
        
        if not response.ok:
            logger.error(f"Error en Planet Search API: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Error en Planet API: {response.text}")
            
        data = response.json()
        
        # Transformar resultados al formato que espera el frontend
        results = []
        for feature in data.get('features', []):
            props = feature.get('properties', {})
            results.append({
                "id": feature.get('id'),
                "full_id": feature.get('id'),
                "date": props.get('acquired', '').split('T')[0],
                "cloud_coverage": round(props.get('cloud_cover', 0) * 100, 2),
                "bands": ["Blue", "Green", "Red", "NIR", "RedEdge", "Coastal Blue", "Yellow", "Green-I", "UDM2"], 
                "product_id": feature.get('id'),
                "spacecraft": props.get('satellite_id', 'PlanetScope'),
                "orbit": 0, # Planet no expone esto directamente igual que Sentinel
                "item_type": feature.get('properties', {}).get('item_type')
            })
            
        return results
        
    except Exception as e:
        logger.error(f"Error en búsqueda de Planet: {str(e)}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/planet/order")
async def order_planet_images(request: OrderPlanetRequest):
    import requests
    try:
        logger.info(f"Creando orden en Planet: {request.name}")
        
        # Estructura del pedido (Order)
        payload = {
            "name": request.name,
            "products": [
                {
                    "item_ids": request.item_ids,
                    "item_type": request.item_type,
                    "product_bundle": request.bundle
                }
            ]
        }
        
        payload["delivery"] = {
            "archive_type": "zip",
            "single_archive": True
        }

        # Si se proporciona geometría, aplicar clip
        if request.geometry:
            planet_geom = request.geometry
            # Si es un dict (GeoJSON format completo)
            if isinstance(planet_geom, dict) and "type" in planet_geom and planet_geom["type"].lower() == "polygon":
                 pass # Ya está bien formado
            # Si es una lista, Laravel nos asegura que es un array de pares [lng, lat]
            elif isinstance(planet_geom, list):
                 # Por seguridad, si el primer elemento no es una lista, algo está mal
                 if len(planet_geom) > 0 and isinstance(planet_geom[0], list):
                     # Envolver en un array adicional para cumplir con la especificación Polygon
                     planet_geom = {
                        "type": "Polygon",
                        "coordinates": [planet_geom]
                     }

            payload["tools"] = [
                {
                    "clip": {
                        "aoi": planet_geom
                    }
                }
            ]
            
        auth = get_planet_auth(request.api_key)
        response = requests.post(
            "https://api.planet.com/compute/ops/orders/v2",
            auth=auth,
            json=payload
        )
        
        if not response.ok:
            logger.error(f"Error en Planet Orders API: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Error en Planet API: {response.text}")
            
        return response.json()
        
    except Exception as e:
        logger.error(f"Error en pedido de Planet: {str(e)}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/planet/order/{order_id}")
async def get_planet_order_status(order_id: str, api_key: str):
    import requests
    try:
        logger.info(f"Consultando estado de orden Planet: {order_id}")
        
        auth = get_planet_auth(api_key)
        response = requests.get(
            f"https://api.planet.com/compute/ops/orders/v2/{order_id}",
            auth=auth
        )
        
        if not response.ok:
            logger.error(f"Error consultando orden Planet: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Error Planet API: {response.text}")
            
        return response.json()
        
    except Exception as e:
        logger.error(f"Error obteniendo estado de pedido Planet: {str(e)}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/convert-image")
async def convert_image(
    file: UploadFile = File(...), 
    output_format: str = "JPEG",
    quality: int = 85,
    max_width: Optional[int] = None,
    max_height: Optional[int] = None
):
    """
    Convierte una imagen TIFF a formato JPEG o PNG para previsualización
    """
    try:
        # Validar formato de entrada
        if not file.filename.lower().endswith(('.tiff', '.tif')):
            raise HTTPException(status_code=400, detail="Solo se aceptan archivos TIFF")
        
        # Validar formato de salida
        if output_format.upper() not in ["JPEG", "PNG"]:
            raise HTTPException(status_code=400, detail="Formato de salida debe ser JPEG o PNG")
        
        logger.info(f"Convirtiendo archivo TIFF: {file.filename}")
        
        # Leer el archivo TIFF
        content = await file.read()
        
        # Convertir usando PIL
        try:
            # Abrir imagen con PIL
            with Image.open(io.BytesIO(content)) as img:
                logger.info(f"Imagen cargada con PIL: {img.size}, modo: {img.mode}")
                
                # Convertir a RGB si es necesario (para JPEG)
                if output_format.upper() == "JPEG" and img.mode in ("RGBA", "P", "L"):
                    img = img.convert("RGB")
                elif output_format.upper() == "PNG" and img.mode == "P":
                    img = img.convert("RGBA")
                
                # Redimensionar si se especifica
                if max_width or max_height:
                    original_width, original_height = img.size
                    
                    # Calcular nuevo tamaño manteniendo aspect ratio
                    if max_width and max_height:
                        ratio = min(max_width / original_width, max_height / original_height)
                    elif max_width:
                        ratio = max_width / original_width
                    else:
                        ratio = max_height / original_height
                    
                    new_width = int(original_width * ratio)
                    new_height = int(original_height * ratio)
                    
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    logger.info(f"Imagen redimensionada a: {new_width}x{new_height}")
                
                # Guardar en memoria
                output_buffer = io.BytesIO()
                
                if output_format.upper() == "JPEG":
                    img.save(output_buffer, format="JPEG", quality=quality, optimize=True)
                    media_type = "image/jpeg"
                    extension = "jpg"
                else:
                    img.save(output_buffer, format="PNG", optimize=True)
                    media_type = "image/png"
                    extension = "png"
                
                output_buffer.seek(0)
                
                # Generar nombre de archivo de salida
                base_name = os.path.splitext(file.filename)[0]
                output_filename = f"{base_name}_preview.{extension}"
                
                logger.info(f"Conversión exitosa con PIL: {output_filename}")
                
                return StreamingResponse(
                    io.BytesIO(output_buffer.read()),
                    media_type=media_type,
                    headers={
                        "Content-Disposition": f"attachment; filename={output_filename}",
                        "X-Conversion-Status": "success"
                    }
                )
                
        except Exception as pil_error:
            logger.error(f"Error al convertir con PIL: {str(pil_error)}. Intentando con tifffile...")
            try:
                import tifffile
                with tifffile.TiffFile(io.BytesIO(content)) as tif:
                    img_array = tif.asarray()
                
                logger.info(f"Imagen cargada con tifffile, shape: {img_array.shape}, dtype: {img_array.dtype}")
                
                # Manejar dimensiones
                if img_array.ndim == 3:
                    # Formato habitual (bands, height, width). Transponer si bands es el primer eje
                    if img_array.shape[0] < img_array.shape[1] and img_array.shape[0] < img_array.shape[2]:
                        img_array = np.transpose(img_array, (1, 2, 0))
                    
                    bands_count = img_array.shape[2]
                    if bands_count >= 3:
                        # Extraer las primeras 3 bandas para RGB (típicamente R, G, B)
                        rgb_array = img_array[:, :, :3]
                    elif bands_count == 2:
                        rgb_array = np.zeros((img_array.shape[0], img_array.shape[1], 3), dtype=img_array.dtype)
                        rgb_array[:, :, 0] = img_array[:, :, 0]
                        rgb_array[:, :, 1] = img_array[:, :, 1]
                    else:
                        rgb_array = np.repeat(img_array[:, :, :1], 3, axis=2)
                elif img_array.ndim == 2:
                    rgb_array = np.repeat(img_array[:, :, np.newaxis], 3, axis=2)
                else:
                    raise Exception(f"Número de dimensiones no soportado: {img_array.ndim}")
                
                # Normalizar a uint8
                rgb_array = rgb_array.astype(np.float32)
                rgb_array = np.nan_to_num(rgb_array, nan=0.0, posinf=0.0, neginf=0.0)
                
                h, w, c = rgb_array.shape
                step_h = max(1, h // 100)
                step_w = max(1, w // 100)
                sub_sample = rgb_array[::step_h, ::step_w, :]
                
                p2, p98 = np.percentile(sub_sample, (2, 98))
                if p98 > p2:
                    rgb_array = np.clip(rgb_array, p2, p98)
                    rgb_array = (rgb_array - p2) / (p98 - p2) * 255.0
                else:
                    vmin = rgb_array.min()
                    vmax = rgb_array.max()
                    if vmax > vmin:
                        rgb_array = (rgb_array - vmin) / (vmax - vmin) * 255.0
                    else:
                        rgb_array = np.zeros_like(rgb_array)
                
                rgb_array = rgb_array.astype(np.uint8)
                
                # Crear imagen PIL
                img = Image.fromarray(rgb_array, mode="RGB")
                
                # Redimensionar si se especifica
                if max_width or max_height:
                    original_width, original_height = img.size
                    
                    if max_width and max_height:
                        ratio = min(max_width / original_width, max_height / original_height)
                    elif max_width:
                        ratio = max_width / original_width
                    else:
                        ratio = max_height / original_height
                    
                    new_width = int(original_width * ratio)
                    new_height = int(original_height * ratio)
                    
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    logger.info(f"Imagen de tifffile redimensionada a: {new_width}x{new_height}")
                
                # Guardar en memoria
                output_buffer = io.BytesIO()
                
                if output_format.upper() == "JPEG":
                    img.save(output_buffer, format="JPEG", quality=quality, optimize=True)
                    media_type = "image/jpeg"
                    extension = "jpg"
                else:
                    img.save(output_buffer, format="PNG", optimize=True)
                    media_type = "image/png"
                    extension = "png"
                
                output_buffer.seek(0)
                
                base_name = os.path.splitext(file.filename)[0]
                output_filename = f"{base_name}_preview.{extension}"
                
                logger.info(f"Conversión exitosa con tifffile: {output_filename}")
                
                return StreamingResponse(
                    io.BytesIO(output_buffer.read()),
                    media_type=media_type,
                    headers={
                        "Content-Disposition": f"attachment; filename={output_filename}",
                        "X-Conversion-Status": "success"
                    }
                )
            except Exception as tif_error:
                logger.error(f"Error al convertir con tifffile: {str(tif_error)}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"No se pudo convertir la imagen TIFF ni con PIL ni con tifffile. Error PIL: {str(pil_error)}. Error tifffile: {str(tif_error)}"
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error general en conversión: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
