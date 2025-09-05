import React from 'react';

interface SatelliteImage {
    id: string;
    full_id?: string;
    date: string;
    cloud_coverage: number;
    bands: string[];
    product_id: string;
    spacecraft: string;
    orbit: number;
}

interface SatelliteTabProps {
    searchResults: SatelliteImage[];
    onDownloadImage?: (imageId: string, bandName: string) => void;
}

export const SatelliteTab: React.FC<SatelliteTabProps> = ({
    searchResults,
    onDownloadImage
}) => {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="w-16 h-16 mx-auto mb-3 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl">🛰️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Imágenes Satelitales</h3>
                <p className="text-sm text-gray-600 mt-1">
                    {searchResults.length > 0 
                        ? `${searchResults.length} imagen${searchResults.length !== 1 ? 'es' : ''} encontrada${searchResults.length !== 1 ? 's' : ''}` 
                        : 'Realiza una búsqueda para ver imágenes disponibles'
                    }
                </p>
            </div>

            {/* Lista de imágenes */}
            {searchResults.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {searchResults.map((image, index) => (
                        <div key={image.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                            {/* Header de la imagen */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                                        {image.spacecraft}
                                    </span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        Imagen #{index + 1}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400">
                                    {image.date}
                                </div>
                            </div>

                            {/* Información de la imagen */}
                            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                <div className="bg-gray-50 p-2 rounded">
                                    <div className="flex items-center gap-1 text-gray-600">
                                        <span>☁️</span>
                                        <span className="font-medium">{image.cloud_coverage}%</span>
                                    </div>
                                    <div className="text-xs text-gray-500">Cobertura de nubes</div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                    <div className="flex items-center gap-1 text-gray-600">
                                        <span>🛰️</span>
                                        <span className="font-medium">{image.orbit}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">Número de órbita</div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded col-span-2">
                                    <div className="flex items-center gap-1 text-gray-600">
                                        <span>📊</span>
                                        <span className="font-medium">{image.bands.length} bandas espectrales</span>
                                    </div>
                                    <div className="text-xs text-gray-500">Disponibles: {image.bands.join(', ')}</div>
                                </div>
                            </div>

                            {/* ID del producto */}
                            <div className="bg-gray-50 p-2 rounded mb-3">
                                <div className="text-xs text-gray-500 mb-1">ID del Producto:</div>
                                <div className="text-xs font-mono text-gray-700 break-all">{image.product_id}</div>
                            </div>

                            {/* Panel de descarga */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-blue-600 font-medium text-sm">📥 Descargar Imagen</span>
                                </div>
                                <div className="space-y-2">
                                    <select 
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        id={`band-${image.id}`}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Seleccionar banda espectral</option>
                                        {image.bands.map((band) => (
                                            <option key={band} value={band}>
                                                {band} {
                                                    band === 'B4' ? '(Rojo - 665nm)' : 
                                                    band === 'B3' ? '(Verde - 560nm)' : 
                                                    band === 'B2' ? '(Azul - 490nm)' : 
                                                    band === 'B8' ? '(Infrarrojo cercano - 842nm)' : 
                                                    band === 'B11' ? '(SWIR - 1610nm)' : 
                                                    band === 'B12' ? '(SWIR - 2190nm)' : ''
                                                }
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => {
                                            const select = document.getElementById(`band-${image.id}`) as HTMLSelectElement;
                                            const selectedBand = select.value;
                                            if (selectedBand && onDownloadImage) {
                                                onDownloadImage(image.full_id || image.id, selectedBand);
                                            } else {
                                                alert('Por favor selecciona una banda espectral');
                                            }
                                        }}
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        📥 Descargar Imagen Satelital
                                    </button>
                                </div>
                                
                                {/* Indicador de calidad */}
                                <div className="mt-2 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                        image.cloud_coverage <= 10 ? 'bg-green-500' :
                                        image.cloud_coverage <= 30 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}></div>
                                    <span className="text-xs text-gray-600">
                                        Calidad: {
                                            image.cloud_coverage <= 10 ? 'Excelente' :
                                            image.cloud_coverage <= 30 ? 'Buena' : 'Regular'
                                        } para análisis
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Información adicional */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">💡</span>
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">Consejos para mejores resultados:</p>
                                <ul className="text-xs space-y-1 text-blue-700">
                                    <li>• Prefiere imágenes con menos del 10% de cobertura de nubes</li>
                                    <li>• Las bandas RGB (B4,B3,B2) son ideales para visualización natural</li>
                                    <li>• La banda B8 (infrarrojo) es útil para análisis de vegetación</li>
                                    <li>• Las bandas SWIR (B11,B12) ayudan a detectar humedad del suelo</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4 opacity-50">🛰️</div>
                    <h4 className="text-lg font-medium text-gray-600 mb-2">No hay imágenes satelitales</h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Dibuja un área en el mapa y realiza una búsqueda<br />
                        en la pestaña "Descarga" para encontrar imágenes.
                    </p>
                    <div className="inline-flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-full">
                        <span>🔍</span>
                        <span>Ve a "Descarga" → Selecciona satélites → Buscar</span>
                    </div>
                </div>
            )}
        </div>
    );
};
