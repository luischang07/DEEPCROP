import os
from pathlib import Path

# Configuración para desarrollo local
GEE_CREDENTIALS_PATH = Path(__file__).parent.parent / "calcium-ember-455119-f6-2fcf0895ae07.json"

# Configuración del servidor
HOST = "0.0.0.0"
PORT = 8001
DEBUG = True

# Configuración de logging
LOG_LEVEL = "INFO"

# Configuración de Earth Engine
EE_COLLECTION_DEFAULT = "COPERNICUS/S2_SR_HARMONIZED"
MAX_IMAGES_LIMIT = 50
DEFAULT_CLOUD_COVER = 100.0
DEFAULT_SCALE = 30.0
