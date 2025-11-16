# Esta clase define las configuraciones esenciales para la app 
# (clave secreta, rutas, límites, extensiones válidas) y
# prepara el entorno de archivos necesario antes de arrancar el servidor.

import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    UPLOAD_FOLDER = 'uploads' # Carpeta para los archivos subidos por el usuario.
    OUTPUT_FOLDER = 'outputs' # Carpeta para los archivos procesados de los usuarios.
    
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB max
    ALLOWED_EXTENSIONS = {'tif', 'tiff', 'jp2', 'png'} # Formatos de imagen permitidos
    
    # Creación de los directorios (si no existen)
    @staticmethod
    def init_app():
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(Config.OUTPUT_FOLDER, exist_ok=True)