# Documentación de Integración de Planet API

Este microservicio ha sido extendido para soportar la búsqueda y el pedido de imágenes de Planet Scope (PSScene).

## Endpoints Disponibles

### 1. Búsqueda de Imágenes (Quick Search)
**POST** `/planet/search`

Busca imágenes disponibles en la constelación de Planet.

**Payload:**
```json
{
  "geometry": { "type": "Polygon", "coordinates": [...] },
  "date_start": "2025-01-01",
  "date_end": "2025-01-16",
  "item_types": ["PSScene"],
  "max_cloud_cover": 20.0,
  "api_key": "tu_api_key"
}
```

### 2. Pedido de Imágenes (Orders)
**POST** `/planet/order`

Realiza un pedido de imágenes específicas. Permite aplicar un "clip" (recorte) al área de interés.

**Payload:**
```json
{
  "name": "Mi Pedido de Enero",
  "item_ids": ["20250110_1530..."],
  "item_type": "PSScene",
  "bundle": "analytic_8b_sr_udm2",
  "geometry": { ... },
  "api_key": "tu_api_key"
}
```

## Autenticación
El microservicio utiliza **Basic Authentication**. Se envía la `api_key` como nombre de usuario y un valor vacío como contraseña en cada petición a Planet.

## Flujo de Trabajo Sugerido
1. El frontend envía una geometría y rango de fechas a `/planet/search`.
2. El usuario selecciona las escenas que desea de los resultados.
3. El frontend envía los IDs de las escenas seleccionadas y la geometría a `/planet/order`.
4. Planet procesa la orden (clip, reproyección, etc.) y posteriormente los archivos estarán disponibles para su descarga.

---
*Nota: Asegúrate de que las coordenadas de la geometría sigan el estándar GeoJSON [longitud, latitud].*
