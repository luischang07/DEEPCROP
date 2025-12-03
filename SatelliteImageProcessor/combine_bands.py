# Este código se encarga de procesar imágenes satelitales (Sentinel-2)
# en formato TIFF y genera un archivo multibanda combinado.
# NOTA: Es necesario mandar todas las bandas del Sentinel para mayor presición.
# Se tiene que retrabajar el código para las bandas faltantes

import rasterio
import numpy as np
import os # Manejador de rutas de archivos

# Rutas de las bandas
band_paths = {
    'blue': 'public/testImages/2025-10-09-00:00_2025-10-09-23:59_Sentinel-2_L2A_B02_(Raw).tiff',
    'red': 'public/testImages/2025-10-09-00:00_2025-10-09-23:59_Sentinel-2_L2A_B04_(Raw).tiff',
    'nir': 'public/testImages/2025-10-09-00:00_2025-10-09-23:59_Sentinel-2_L2A_B08_(Raw).tiff',
}

output_path = 'public/testImages/combined_image.tif'

print("Leyendo bandas...")

# Leer cada banda
bands_data = {}
metadata = None

for band_name, band_path in band_paths.items():
    print(f"  Leyendo {band_name}...")
    with rasterio.open(band_path) as src:
        bands_data[band_name] = src.read(1)
        if metadata is None:
            metadata = src.meta.copy()
            height, width = src.read(1).shape

print(f"Dimensiones: {width}x{height}")
print(f"Tipo de dato: {bands_data['blue'].dtype}")

# Crear imagen multibanda (Blue, Green, Red, NIR, SWIR simulado)
# Como no tenemos Green ni SWIR real, los interpolamos
blue = bands_data['blue'].astype(float)
red = bands_data['red'].astype(float)
nir = bands_data['nir'].astype(float)

# Green: interpolación entre Blue y Red
# Pare evitar la interpolación de la banda Green, se debe usar la banda real de Sentinel-2:
# B03 → Green (~560 nm)
green = (blue + red) / 2

# SWIR simulado: extrapolación del NIR
# Pare evitar simular la 5ta banda, se debe usar las bandas SWIR reales de Sentinel-2:
# B11 → SWIR1 (1610 nm)
# B12 → SWIR2 (2190 nm)
swir = nir * 0.8

# Normalizar a 0-255 para visualización
# Se ajusta cada banda para que sus valores estén entre 0 y 255 para visualización.
# Se usa percentiles 2 y 98 para eliminar valores extremos.
def normalize(band):
    band_min = np.percentile(band, 2)
    band_max = np.percentile(band, 98)
    normalized = ((band - band_min) / (band_max - band_min) * 255).astype(np.uint8)
    return normalized

blue_norm = normalize(blue)
green_norm = normalize(green)
red_norm = normalize(red)
nir_norm = normalize(nir)
swir_norm = normalize(swir)

# Crear array con 5 bandas
# Combina las 5 bandas en un solo arreglo 3D.
# Actualiza la metadata para indicar que ahora hay 5 bandas y el tipo de dato es uint8.
# Escribe el archivo TIFF final con las 5 bandas.
combined_data = np.array([
    blue_norm,      # Banda 1: Blue
    green_norm,     # Banda 2: Green (interpolado)
    red_norm,       # Banda 3: Red
    nir_norm,       # Banda 4: NIR
    swir_norm       # Banda 5: SWIR (simulado)
])

print(f"Combinado: shape={combined_data.shape}")

# Actualizar metadata
metadata.update({
    'count': 5,
    'dtype': rasterio.uint8,
    'driver': 'GTiff'
})

# Guardar imagen combinada
print(f"Guardando en {output_path}...")
with rasterio.open(output_path, 'w', **metadata) as dst:
    for i in range(5):
        dst.write(combined_data[i], i + 1)

print("✅ Imagen combinada creada exitosamente!")
print(f"   Archivo: {output_path}")
print(f"   Bandas: 5 (Blue, Green, Red, NIR, SWIR)")
print(f"\nAhora puedes procesar con:")
print(f"   test_api.py con la imagen: {output_path}")