import ee
import sys
import json
import traceback

def main():
    try:
        # Verificar argumentos de manera más segura
        if len(sys.argv) < 3:
            error_msg = {
                "error": "Argumentos insuficientes",
                "required": ["image_id", "band_name"],
                "received": sys.argv[1:] if len(sys.argv) > 1 else []
            }
            print(json.dumps(error_msg))
            sys.exit(1)

        # Obtener argumentos de forma segura
        image_id = sys.argv[1] if len(sys.argv) > 1 else None
        band_name = sys.argv[2] if len(sys.argv) > 2 else None

        if not image_id or not band_name:
            print(json.dumps({
                "error": "Argumentos inválidos",
                "image_id": image_id,
                "band_name": band_name
            }))
            sys.exit(1)

        # Configurar credenciales
        SERVICE_ACCOUNT = 'deepcroop-sentinel@calcium-ember-455119-f6.iam.gserviceaccount.com'
        KEY_PATH = r'C:\Users\Luis Lopez\Desktop\DEEPCROP\calcium-ember-455119-f6-29e97ad744a7.json'

        # Inicializar Earth Engine
        credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, KEY_PATH)
        ee.Initialize(credentials)

        # Verificar que la imagen existe
        try:
            image = ee.Image(image_id)
            image_info = image.getInfo()  # Esto fallará si la imagen no existe
        except Exception as e:
            print(json.dumps({
                "error": f"No se pudo cargar la imagen {image_id}",
                "details": str(e)
            }))
            sys.exit(1)

        # Verificar que la banda existe
        available_bands = image.bandNames().getInfo()
        if band_name not in available_bands:
            print(json.dumps({
                "error": f"La banda {band_name} no existe en la imagen",
                "available_bands": available_bands
            }))
            sys.exit(1)

        # Obtener URL de descarga
        band = image.select(band_name)
        region = band.geometry().bounds().getInfo()['coordinates']

        url = band.getDownloadURL({
            'scale': 20,
            'crs': 'EPSG:4326',
            'region': region,
            'format': 'GeoTIFF'
        })

        print(json.dumps({
            "download_url": url,
            "image_id": image_id,
            "band_name": band_name,
            "status": "success"
        }))

    except Exception as e:
        print(json.dumps({
            "error": "Error inesperado",
            "details": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()