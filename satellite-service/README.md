# Satellite Service

Microservicio FastAPI para búsqueda y descarga de imágenes satelitales usando Google Earth Engine.

## Características

- **FastAPI**: Framework moderno y rápido para APIs
- **Google Earth Engine**: Integración completa para acceso a imágenes satelitales
- **Docker**: Containerizado para fácil despliegue
- **CORS**: Habilitado para integración con frontend
- **Documentación automática**: Swagger UI disponible en `/docs`
- **Health checks**: Endpoint de salud para monitoreo

## Endpoints

- `GET /` - Información del servicio
- `GET /health` - Health check
- `POST /search` - Búsqueda de imágenes satelitales
- `POST /download` - Generar URL de descarga
- `GET /bands/{collection_name}` - Obtener bandas disponibles

## Uso

### Búsqueda de imágenes

```bash
curl -X POST "http://localhost:8001/search" \
     -H "Content-Type: application/json" \
     -d '{
       "coordinates": [[[-99.1, 19.4], [-99.0, 19.4], [-99.0, 19.5], [-99.1, 19.5], [-99.1, 19.4]]],
       "start_date": "2024-01-01",
       "end_date": "2024-12-31",
       "max_cloud_cover": 10.0
     }'
```

### Descarga de imagen

```bash
curl -X POST "http://localhost:8001/download" \
     -H "Content-Type: application/json" \
     -d '{
       "image_id": "COPERNICUS/S2_SR_HARMONIZED/20240101T170721_20240101T171044_T14QMG",
       "bands": ["B4", "B3", "B2"],
       "scale": 30.0
     }'
```

## Despliegue

```bash
# Construir y ejecutar con Docker Compose
docker-compose -f docker-compose.satellite.yml up --build

# Solo ejecutar (si ya está construido)
docker-compose -f docker-compose.satellite.yml up

# Ejecutar en background
docker-compose -f docker-compose.satellite.yml up -d
```

## Documentación

Una vez ejecutándose, la documentación interactiva estará disponible en:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc
