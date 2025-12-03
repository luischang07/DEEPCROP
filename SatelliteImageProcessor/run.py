# Este código se encarga de inicializar la API:
#
# 1- Carga los módulos principales (app, config).
# 2- Inicializa configuraciones.
# 3- Crea la instancia de la aplicación Flask.
# 4- Maneja errores de forma explícita.
# 5- Inicia el servidor Flask para desarrollo.

import sys

try:
    from app import create_app
    from config import Config
    print("Módulos importados correctamente", file=sys.stderr)
    
    # Inicializar directorios
    Config.init_app()
    print("Directorios inicializados", file=sys.stderr)
    
    # Crear la aplicación
    app = create_app()
    print("Aplicación creada", file=sys.stderr)
    
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)

if __name__ == '__main__':
    print("Iniciando servidor Flask...", file=sys.stderr)
    sys.stderr.flush()
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)