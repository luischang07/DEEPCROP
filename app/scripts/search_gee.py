import ee
import json
import sys
import os

def main():
    if len(sys.argv) != 4:
        print(json.dumps({"error": "Se esperaban 3 argumentos: geojson, start_date, end_date"}))
        return

    geojson_input = sys.argv[1]
    start_date = sys.argv[2]
    end_date = sys.argv[3]

    # Detectar si geojson_input es una ruta a un archivo JSON
    if os.path.isfile(geojson_input):
        try:
            with open(geojson_input, 'r', encoding='utf-8') as f:
                geojson = json.load(f)
        except Exception as e:
            print(json.dumps({
                "error": "Error leyendo el archivo GeoJSON",
                "details": str(e),
                "received_geojson": geojson_input
            }))
            return
    else:
        # Si no es un archivo, asumimos que es el string JSON directo
        try:
            geojson = json.loads(geojson_input)
        except json.JSONDecodeError:
            print(json.dumps({
                "error": "GeoJSON inválido",
                "received_geojson": geojson_input
            }))
            return

    SERVICE_ACCOUNT = 'deepcroop-sentinel@calcium-ember-455119-f6.iam.gserviceaccount.com'
    KEY_PATH = r'C:\Users\Luis Lopez\Desktop\DEEPCROP\calcium-ember-455119-f6-29e97ad744a7.json'

    credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, KEY_PATH)
    ee.Initialize(credentials)

    polygon = ee.Geometry.Polygon(geojson['coordinates'])

    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterDate(start_date, end_date)
        .filterBounds(polygon)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    )

    results = collection.map(lambda img: img.set({
        'id': img.id(),
        'date': img.date().format('YYYY-MM-dd'),
        'cloud_coverage': img.get('CLOUDY_PIXEL_PERCENTAGE'),
        'bands': img.bandNames(),
        'product_id': img.get('PRODUCT_ID'),
        'spacecraft': img.get('SPACECRAFT_NAME'),
        'orbit': img.get('SENSING_ORBIT_NUMBER'),
    }))

    image_list = results.aggregate_array('id').getInfo()
    date_list = results.aggregate_array('date').getInfo()
    cloud_list = results.aggregate_array('cloud_coverage').getInfo()
    bands_list = results.aggregate_array('bands').getInfo()
    product_id_list = results.aggregate_array('product_id').getInfo()
    spacecraft_list = results.aggregate_array('spacecraft').getInfo()
    orbit_list = results.aggregate_array('orbit').getInfo()

    output = []
    for i in range(len(image_list)):
        output.append({
            'id': image_list[i],
            'date': date_list[i],
            'cloud_coverage': cloud_list[i],
            'bands': bands_list[i],
            'product_id': product_id_list[i],
            'spacecraft': spacecraft_list[i],
            'orbit': orbit_list[i],
        })

    print(json.dumps(output))


if __name__ == "__main__":
    main()
