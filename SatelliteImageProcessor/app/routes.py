# Este archivo define las rutas (endpoints) de tu aplicacion usando un Blueprint.

from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import rasterio
import numpy as np
from app.processors.indices import SatelliteIndicesProcessor
from app.utils.validators import allowed_file
from config import Config

bp = Blueprint('main', __name__)

def combine_band_files(file_paths, output_path):
    """Combina múltiples archivos de bandas en un archivo multi-banda"""
    bands_data = []
    metadata = None
    
    print(f"[INFO] Combinando {len(file_paths)} archivos de bandas...")
    
    for file_path in file_paths:
        with rasterio.open(file_path) as src:
            bands_data.append(src.read(1))
            if metadata is None:
                metadata = src.meta.copy()
    
    # Actualizar metadata para múltiples bandas
    metadata.update({
        'count': len(bands_data),
        'dtype': rasterio.float32
    })
    
    # Escribir archivo combinado
    with rasterio.open(output_path, 'w', **metadata) as dst:
        for i, band_data in enumerate(bands_data, 1):
            dst.write(band_data.astype(rasterio.float32), i)
    
    print(f"[INFO] Bandas combinadas en: {output_path}")
    return output_path

# Endpoint para verificar que la API está funcionando
@bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'message': 'Satellite API is running'
    }), 200

# Endpoint principal para procesar imágenes satelitales
# Params:
#   file: Imagen satelital (multipart/form-data)
#   indices: Lista de indices a calcular (opcional, default: todos)
#   index_type: Tipo de índice específico a calcular (opcional: ndvi, ndwi, msi)
#   band_config: Configuracion de bandas (opcional)    
# Return:
#   JSON con rutas de imágenes generadas y estadisticas
@bp.route('/process', methods=['POST'])
def process_image():
    try:
        # Check if multiple files are being uploaded
        multiple_files = 'files[]' in request.files
        
        if multiple_files:
            # Handle multiple band files
            files = request.files.getlist('files[]')
            if len(files) == 0:
                return jsonify({
                    'error': 'No files provided',
                    'message': 'Please upload at least one band file'
                }), 400
            
            # Save all band files
            band_filepaths = []
            for file in files:
                if file.filename == '':
                    continue
                if not allowed_file(file.filename):
                    return jsonify({
                        'error': 'Invalid file type',
                        'message': f'File {file.filename} has invalid type. Allowed: {Config.ALLOWED_EXTENSIONS}'
                    }), 400
                
                filename = secure_filename(file.filename)
                filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
                file.save(filepath)
                band_filepaths.append(filepath)
            
            # Combine bands into single multi-band file
            combined_filename = 'combined_bands.tif'
            combined_filepath = os.path.join(Config.UPLOAD_FOLDER, combined_filename)
            combine_band_files(band_filepaths, combined_filepath)
            
            # Use combined file for processing
            filepath = combined_filepath
            filename = combined_filename
            
            # Clean up individual band files
            for band_file in band_filepaths:
                try:
                    os.remove(band_file)
                except:
                    pass
                    
        else:
            # Handle single file
            if 'file' not in request.files:
                return jsonify({
                    'error': 'No file provided',
                    'message': 'Please upload a file in the "file" field'
                }), 400
            
            file = request.files['file']
            
            # Verifica que el archivo tenga nombre
            if file.filename == '':
                return jsonify({
                    'error': 'Empty filename',
                    'message': 'The uploaded file has no name'
                }), 400
            
            # Verifica la extension del archivo
            if not allowed_file(file.filename):
                return jsonify({
                    'error': 'Invalid file type',
                    'message': f'Allowed types: {Config.ALLOWED_EXTENSIONS}'
                }), 400
            
            # Guardar archivo
            filename = secure_filename(file.filename)
            filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
            file.save(filepath)
        
        # Obtener configuracion de bandas si se proporciona
        band_config = None
        if request.form.get('band_config'):
            import json
            band_config = json.loads(request.form.get('band_config'))
        
        # Verificar si se solicita un índice específico
        index_type = request.form.get('index_type')
        
        # Procesar imagen
        processor = SatelliteIndicesProcessor(filepath)
        
        if index_type and index_type in ['ndvi', 'ndwi', 'msi']:
            # Procesar solo el índice especificado
            results = processor.process_single_index(index_type, Config.OUTPUT_FOLDER, band_config)
        else:
            # Procesar todos los índices
            results = processor.process_all_indices(Config.OUTPUT_FOLDER, band_config)
        
        # Verificar si hubo error en el procesamiento
        if 'error' in results:
            os.remove(filepath)
            return jsonify({
                'status': 'error',
                'message': results['error'],
                'original_filename': filename
            }), 400
        
        # Verificar si el índice específico tiene error
        if index_type and index_type in results and 'error' in results[index_type]:
            os.remove(filepath)
            return jsonify({
                'status': 'error',
                'message': results[index_type]['error'],
                'original_filename': filename,
                'index_type': index_type
            }), 400
        
        # Preparar respuesta
        response = {
            'status': 'success',
            'message': 'Image processed successfully',
            'original_filename': filename,
            'results': results
        }
        
        # Limpiar archivo subido (Comentar si se quiere almacenar el archivo)
        os.remove(filepath)
        
        return jsonify(response), 200
        
    except Exception as e:
        import traceback
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500

# Endpoint para descargar las imágenes generadas
# Params:
#   index_type: Tipo de indice (ndvi, ndwi, msi)
#   filename: Nombre del archivo
@bp.route('/download/<index_type>/<filename>', methods=['GET'])
def download_result(index_type, filename):
    try:
        # Use absolute path
        file_path = os.path.abspath(os.path.join(Config.OUTPUT_FOLDER, filename))
        
        print(f"[DEBUG] Download request - index_type: {index_type}, filename: {filename}")
        print(f"[DEBUG] Looking for file at: {file_path}")
        print(f"[DEBUG] File exists: {os.path.exists(file_path)}")
        
        if not os.path.exists(file_path):
            # List files in output folder for debugging
            print(f"[DEBUG] Files in {Config.OUTPUT_FOLDER}:")
            try:
                for f in os.listdir(Config.OUTPUT_FOLDER):
                    print(f"  - {f}")
            except Exception as list_err:
                print(f"[ERROR] Could not list directory: {list_err}")
            
            return jsonify({
                'error': 'File not found',
                'message': f'The file {filename} does not exist at {file_path}'
            }), 404
        
        print(f"[DEBUG] Sending file: {file_path}")
        return send_file(file_path, mimetype='image/png', as_attachment=False)
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Download failed: {str(e)}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Download failed',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500

# Endpoint que lista los indices disponibles y su descripcion
@bp.route('/indices', methods=['GET'])
def get_available_indices():
    indices_info = {
        'ndvi': {
            'name': 'NDVI',
            'full_name': 'Normalized Difference Vegetation Index',
            'description': 'Indica la salud y vigor de la vegetacion',
            'required_bands': '3 bands (B2: Azul (490 nm), B3: Verde (560 nm), B4: Rojo (665 nm))',
            'range': [-1, 1],
            'interpretation': {
                'negative': 'Agua, nubes, nieve',
                '0-0.2': 'Suelo desnudo, rocas',
                '0.2-0.5': 'Vegetacion escasa o estresada',
                '0.5-0.8': 'Vegetacion saludable',
                '0.8-1': 'Vegetacion muy densa y saludable'
            }
        },
        'ndwi': {
            'name': 'NDWI',
            'full_name': 'Normalized Difference Water Index',
            'description': 'Detecta contenido de agua en la vegetacion',
            'required_bands': '5 bands (B2: Azul, B3: Verde, B4: Rojo, B8: Infrarrojo cercano (NIR), B11: Infrarrojo de onda corta 1 (SWIR 1), B12: Infrarrojo de onda corta 2 (SWIR 2))',
            'range': [-1, 1],
            'interpretation': {
                'low': 'Estres hidrico severo',
                'medium': 'Estres hidrico moderado',
                'high': 'Buena disponibilidad de agua'
            }
        },
        'msi': {
            'name': 'MSI',
            'full_name': 'Moisture Stress Index',
            'description': 'Indicador de estres hidrico en cultivos',
            'required_bands': '5 bands (B2: Azul, B3: Verde, B4: Rojo, B8: Infrarrojo cercano (NIR), B11: Infrarrojo de onda corta 1 (SWIR 1), B12: Infrarrojo de onda corta 2 (SWIR 2))',
            'range': [0, 3],
            'interpretation': {
                'low': 'Sin estres hidrico',
                'medium': 'Estres moderado',
                'high': 'Estres hidrico severo'
            }
        }
    }
    
    return jsonify({
        'status': 'success',
        'available_indices': indices_info
    }), 200