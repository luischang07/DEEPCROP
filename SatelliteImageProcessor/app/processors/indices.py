import numpy as np
import rasterio
from rasterio.transform import from_bounds
import matplotlib
matplotlib.use('Agg')  # Usar backend sin GUI
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import os

# Procesador de indices de vegetacion para imagenes satelitales
class SatelliteIndicesProcessor:
    
    def __init__(self, image_path):
        self.image_path = image_path
        self.data = None
        self.metadata = None
        
    # Abre la imagen TIFF y carga todas las bandas en self.data.
    # Guarda la información geográfica (transformación espacial y sistema de coordenadas).
    def read_image(self):
        with rasterio.open(self.image_path) as src:
            self.data = src.read()
            self.metadata = src.meta.copy()
            self.transform = src.transform
            self.crs = src.crs
        return self.data
    
    # Calcula el NDVI (Normalized Difference Vegetation Index)
    # FORMULA: NDVI = (NIR - Red) / (NIR + Red)
    # Params:
    #   nir_band: indice de la banda NIR (infrarrojo cercano)
    #   red_band: indice de la banda Red (rojo)
    def calculate_ndvi(self, nir_band=4, red_band=3):
        if self.data is None:
            self.read_image()
        
        # Extraer bandas (indices en base 1 se convierten a base 0)
        nir = self.data[nir_band - 1].astype(float)
        red = self.data[red_band - 1].astype(float)
        
        # Evitar division por cero
        denominator = nir + red
        denominator[denominator == 0] = np.nan
        
        # Calcular NDVI
        ndvi = (nir - red) / denominator
        
        return ndvi
    
    # Calcula el NDWI (Normalized Difference Water Index)
    # FORMULA: NDWI = (NIR - SWIR) / (NIR + SWIR)
    # Params:
    #   nir_band: indice de la banda NIR (infrarrojo cercano)
    #   swir_band: indice de la banda SWIR (infrarrojo de onda corta)
    def calculate_ndwi(self, nir_band=4, swir_band=5):
        if self.data is None:
            self.read_image()
        
        nir = self.data[nir_band - 1].astype(float)
        swir = self.data[swir_band - 1].astype(float)
        
        denominator = nir + swir
        denominator[denominator == 0] = np.nan
        
        ndwi = (nir - swir) / denominator
        
        return ndwi
    
    # Calcula el NDMI (Normalized Difference Moisture Index)
    # FORMULA: NDMI = (NIR - SWIR) / (NIR + SWIR)
    # Params:
    #   nir_band: indice de la banda NIR (infrarrojo cercano)
    #   swir_band: indice de la banda SWIR (infrarrojo de onda corta)
    def calculate_ndmi(self, nir_band=4, swir_band=5):
        return self.calculate_ndwi(nir_band, swir_band)
    
    # Calcula el MSI (Moisture Stress Index)
    # FORMULA: MSI = SWIR / NIR
    # Params:
    #   swir_band: indice de la banda SWIR (infrarrojo de onda corta)
    #   nir_band: indice de la banda NIR (infrarrojo cercano)
    def calculate_msi(self, swir_band=5, nir_band=4):
        if self.data is None:
            self.read_image()
        
        nir = self.data[nir_band - 1].astype(float)
        swir = self.data[swir_band - 1].astype(float)
        
        nir[nir == 0] = np.nan
        
        msi = swir / nir
        
        return msi
    
    # Calcula el VARI (Visible Atmospherically Resistant Index)
    # FORMULA: VARI = (Green - Red) / (Green + Red - Blue)
    # Params:
    #   red_band: indice de la banda Red (rojo)
    #   green_band: indice de la banda Green (verde)
    #   blue_band: indice de la banda Blue (azul)
    def calculate_vari(self, red_band=3, green_band=2, blue_band=1):
        if self.data is None:
            self.read_image()
        
        red = self.data[red_band - 1].astype(float)
        green = self.data[green_band - 1].astype(float)
        blue = self.data[blue_band - 1].astype(float)
        
        denominator = green + red - blue
        denominator[denominator == 0] = np.nan
        
        vari = (green - red) / denominator
        
        return vari
    
    # Genera una imagen coloreada del indice calculado
    # Params:
    #   index_data: Datos del indice calculado
    #   index_name: Nombre del indice
    #   output_path: Ruta donde guardar la imagen
    #   colormap: Mapa de colores de matplotlib
    def generate_colored_image(self, index_data, index_name, output_path, colormap='RdYlGn'):
        print(f"[DEBUG] Generando imagen: {output_path}")
        
        plt.figure(figsize=(12, 10))
        
        # Crear subplot
        ax = plt.subplot(111)
        
        # Crear imagen con colormap
        if index_name == 'NDVI':
            vmin, vmax = -1, 1
            cmap = plt.cm.RdYlGn
        elif index_name in ['NDWI', 'NDMI']:
            vmin, vmax = -1, 1
            cmap = plt.cm.RdYlBu
        elif index_name == 'MSI':
            vmin, vmax = 0, 3
            cmap = plt.cm.RdYlGn_r  # Invertido porque valores altos = estrés
        elif index_name == 'VARI':
            vmin, vmax = -1, 1
            cmap = plt.cm.RdYlGn
        else:
            vmin, vmax = np.nanpercentile(index_data, [2, 98])
            cmap = colormap
        
        im = ax.imshow(index_data, cmap=cmap, vmin=vmin, vmax=vmax)
        
        # Añadir colorbar
        cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
        cbar.set_label(f'{index_name} Value', rotation=270, labelpad=20)
        
        # Titulo
        plt.title(f'{index_name} - Analisis de Vegetacion', fontsize=14, pad=20)
        
        # Remover ejes
        ax.axis('off')
        
        # Guardar
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"[DEBUG] Imagen guardada exitosamente en: {output_path}")
        print(f"[DEBUG] ¿Archivo existe?: {os.path.exists(output_path)}")
        
        return output_path
    
    # Procesa un índice específico y genera la imagen
    # Args:
    #   index_type: Tipo de índice a calcular ('ndvi', 'ndwi', 'msi')
    #   output_dir: Directorio donde guardar la imagen
    #   band_config: Configuracion de bandas (dict)
    def process_single_index(self, index_type, output_dir, band_config=None):
        # Lee la imagen primero para ver cuantas bandas tiene
        if self.data is None:
            self.read_image()
        
        num_bands = self.data.shape[0]
        print(f"[INFO] Imagen con {num_bands} bandas detectadas")
        
        if band_config is None:
            # Configuracion automatica según el número de bandas
            if num_bands >= 5:
                band_config = {
                    'nir': 4,
                    'red': 3,
                    'green': 2,
                    'blue': 1,
                    'swir': 5
                }
                print("[INFO] Usando configuracion para imagen multiespectral (5+ bandas)")
            elif num_bands == 4:
                band_config = {
                    'nir': 4,
                    'red': 1,
                    'green': 2,
                    'blue': 3,
                    'swir': 4
                }
                print("[INFO] Usando configuracion para imagen RGB-NIR (4 bandas)")
            elif num_bands == 3:
                band_config = {
                    'nir': 3,
                    'red': 1,
                    'green': 2,
                    'blue': 1,
                    'swir': 3
                }
                print("[WARNING] Imagen RGB detectada (3 bandas). Los indices seran aproximaciones.")
            else:
                return {'error': f'Imagen con {num_bands} bandas no soportada. Se requieren al menos 3 bandas.'}
        
        results = {}
        base_filename = os.path.splitext(os.path.basename(self.image_path))[0]
        
        try:
            if index_type == 'ndvi':
                ndvi = self.calculate_ndvi(band_config['nir'], band_config['red'])
                ndvi_path = os.path.join(output_dir, f'{base_filename}_NDVI.png')
                self.generate_colored_image(ndvi, 'NDVI', ndvi_path)
                results['ndvi'] = {
                    'index_name': 'NDVI',
                    'output_path': ndvi_path,
                    'statistics': {
                        'mean': float(np.nanmean(ndvi)),
                        'min': float(np.nanmin(ndvi)),
                        'max': float(np.nanmax(ndvi)),
                        'std': float(np.nanstd(ndvi))
                    }
                }
            
            elif index_type == 'ndwi':
                if num_bands >= 5:
                    ndwi = self.calculate_ndwi(band_config['nir'], band_config['swir'])
                    ndwi_path = os.path.join(output_dir, f'{base_filename}_NDWI.png')
                    self.generate_colored_image(ndwi, 'NDWI', ndwi_path)
                    results['ndwi'] = {
                        'index_name': 'NDWI',
                        'output_path': ndwi_path,
                        'statistics': {
                            'mean': float(np.nanmean(ndwi)),
                            'min': float(np.nanmin(ndwi)),
                            'max': float(np.nanmax(ndwi)),
                            'std': float(np.nanstd(ndwi))
                        }
                    }
                else:
                    results['ndwi'] = {'error': 'Requiere banda SWIR (minimo 5 bandas)'}
            
            elif index_type == 'msi':
                if num_bands >= 5:
                    msi = self.calculate_msi(band_config['swir'], band_config['nir'])
                    msi_path = os.path.join(output_dir, f'{base_filename}_MSI.png')
                    self.generate_colored_image(msi, 'MSI', msi_path)
                    results['msi'] = {
                        'index_name': 'MSI',
                        'output_path': msi_path,
                        'statistics': {
                            'mean': float(np.nanmean(msi)),
                            'min': float(np.nanmin(msi)),
                            'max': float(np.nanmax(msi)),
                            'std': float(np.nanstd(msi))
                        }
                    }
                else:
                    results['msi'] = {'error': 'Requiere banda SWIR (minimo 5 bandas)'}
            
            else:
                results['error'] = f'Tipo de índice no soportado: {index_type}'
        
        except Exception as e:
            results[index_type] = {'error': str(e)}
            print(f"[ERROR] {index_type.upper()}: {str(e)}")
        
        return results
    
    # Procesa todos los indices disponibles y genera imagenes
    # Args:
    #   output_dir: Directorio donde guardar las imagenes
    #   band_config: Configuracion de bandas (dict)
    def process_all_indices(self, output_dir, band_config=None):
        # Lee la imagen primero para ver cuantas bandas tiene
        if self.data is None:
            self.read_image()
        
        num_bands = self.data.shape[0]
        print(f"[INFO] Imagen con {num_bands} bandas detectadas")
        
        if band_config is None:
            # Configuracion automatica según el número de bandas
            if num_bands >= 5:
                # Configuracion para Sentinel-2 o similar (5+ bandas)
                band_config = {
                    'nir': 4,
                    'red': 3,
                    'green': 2,
                    'blue': 1,
                    'swir': 5
                }
                print("[INFO] Usando configuracion para imagen multiespectral (5+ bandas)")
            elif num_bands == 4:
                # Configuracion para imagenes de 4 bandas (RGB + NIR)
                band_config = {
                    'nir': 4,
                    'red': 1,
                    'green': 2,
                    'blue': 3,
                    'swir': 4  # Usar NIR como aproximacion de SWIR
                }
                print("[INFO] Usando configuracion para imagen RGB-NIR (4 bandas)")
            elif num_bands == 3:
                # Configuracion para imagenes RGB (3 bandas)
                band_config = {
                    'nir': 3,  # Usar banda 3 como aproximacion
                    'red': 1,
                    'green': 2,
                    'blue': 1,
                    'swir': 3  # Usar banda 3 como aproximacion
                }
                print("[WARNING] Imagen RGB detectada (3 bandas). Los indices seran aproximaciones.")
            else:
                print(f"[ERROR] Número de bandas no soportado: {num_bands}")
                return {'error': f'Imagen con {num_bands} bandas no soportada. Se requieren al menos 3 bandas.'}
        
        results = {}
        base_filename = os.path.splitext(os.path.basename(self.image_path))[0]
        
        try:
            # NDVI
            ndvi = self.calculate_ndvi(band_config['nir'], band_config['red'])
            ndvi_path = os.path.join(output_dir, f'{base_filename}_NDVI.png')
            self.generate_colored_image(ndvi, 'NDVI', ndvi_path)
            results['ndvi'] = {
                'path': ndvi_path,
                'mean': float(np.nanmean(ndvi)),
                'min': float(np.nanmin(ndvi)),
                'max': float(np.nanmax(ndvi))
            }
        except Exception as e:
            results['ndvi'] = {'error': str(e)}
            print(f"[ERROR] NDVI: {str(e)}")
        
        try:
            # NDWI - Solo si tenemos banda SWIR real
            if num_bands >= 5:
                ndwi = self.calculate_ndwi(band_config['nir'], band_config['swir'])
                ndwi_path = os.path.join(output_dir, f'{base_filename}_NDWI.png')
                self.generate_colored_image(ndwi, 'NDWI', ndwi_path)
                results['ndwi'] = {
                    'path': ndwi_path,
                    'mean': float(np.nanmean(ndwi)),
                    'min': float(np.nanmin(ndwi)),
                    'max': float(np.nanmax(ndwi))
                }
            else:
                results['ndwi'] = {'error': 'Requiere banda SWIR (minimo 5 bandas)', 'skipped': True}
        except Exception as e:
            results['ndwi'] = {'error': str(e)}
            print(f"[ERROR] NDWI: {str(e)}")
        
        try:
            # MSI - Solo si tenemos banda SWIR real
            if num_bands >= 5:
                msi = self.calculate_msi(band_config['swir'], band_config['nir'])
                msi_path = os.path.join(output_dir, f'{base_filename}_MSI.png')
                self.generate_colored_image(msi, 'MSI', msi_path)
                results['msi'] = {
                    'path': msi_path,
                    'mean': float(np.nanmean(msi)),
                    'min': float(np.nanmin(msi)),
                    'max': float(np.nanmax(msi))
                }
            else:
                results['msi'] = {'error': 'Requiere banda SWIR (minimo 5 bandas)', 'skipped': True}
        except Exception as e:
            results['msi'] = {'error': str(e)}
            print(f"[ERROR] MSI: {str(e)}")
        
        return results