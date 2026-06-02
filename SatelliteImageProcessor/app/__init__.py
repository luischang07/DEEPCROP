# Este código se encarga de:
# 1- Crear una instancia de Flask.
# 2- Carga configuraciones desde Config.
# 3- Habilita CORS para peticiones externas.
# 4- Registra rutas/blueprints de la aplicación.
# 5- Devuelve la app lista para correr con app.run() o para usarla en tests.

from flask import Flask
from flask_cors import CORS
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Habilitar CORS para permitir peticiones desde el frontend
    CORS(app)
    
    # Registrar blueprints/rutas
    from app.routes import bp as main_bp
    app.register_blueprint(main_bp)
    
    return app