import React, { useState, useCallback } from 'react';

interface Coordinates {
    lat: number;
    lng: number;
}

interface SatelliteImage {
    id: string;
    date: string;
    cloud_coverage: number;
    bands: string[];
    product_id: string;
    spacecraft: string;
    orbit: number;
}

interface SearchParams {
    coordinates: number[][][];
    start_date: string;
    end_date: string;
}

const SatelliteSearch: React.FC = () => {
    const [searchParams, setSearchParams] = useState<SearchParams>({
        coordinates: [],
        start_date: '',
        end_date: ''
    });
    const [images, setImages] = useState<SatelliteImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [coordinates, setCoordinates] = useState<Coordinates[]>([]);
    
    // Agregar punto de coordenadas
    const addCoordinate = useCallback(() => {
        setCoordinates(prev => [...prev, { lat: 0, lng: 0 }]);
    }, []);

    // Remover punto de coordenadas
    const removeCoordinate = useCallback((index: number) => {
        setCoordinates(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Actualizar coordenada específica
    const updateCoordinate = useCallback((index: number, field: 'lat' | 'lng', value: number) => {
        setCoordinates(prev => prev.map((coord, i) => 
            i === index ? { ...coord, [field]: value } : coord
        ));
    }, []);

    // Buscar imágenes
    const searchImages = useCallback(async () => {
        if (coordinates.length < 3) {
            setError('Se necesitan al menos 3 puntos para formar un polígono');
            return;
        }

        if (!searchParams.start_date || !searchParams.end_date) {
            setError('Las fechas de inicio y fin son requeridas');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Convertir coordenadas al formato esperado por el backend
            const coordinatesArray = coordinates.map(coord => [coord.lng, coord.lat]);
            // Cerrar el polígono agregando el primer punto al final
            coordinatesArray.push(coordinatesArray[0]);

            const response = await fetch('/api/satellite/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({
                    coordinates: [coordinatesArray],
                    start_date: searchParams.start_date,
                    end_date: searchParams.end_date
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al buscar imágenes');
            }

            setImages(data.images || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }, [coordinates, searchParams]);

    // Descargar imagen
    const downloadImage = useCallback(async (imageId: string, bandName: string) => {
        try {
            setLoading(true);
            const response = await fetch('/api/satellite/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({
                    image_id: imageId,
                    band_name: bandName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al obtener URL de descarga');
            }

            // Abrir URL de descarga en nueva ventana
            window.open(data.download_url, '_blank');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Búsqueda de Imágenes Satelitales</h1>
            
            {/* Formulario de búsqueda */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Parámetros de Búsqueda</h2>
                
                {/* Fechas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fecha de Inicio
                        </label>
                        <input
                            type="date"
                            value={searchParams.start_date}
                            onChange={(e) => setSearchParams(prev => ({ ...prev, start_date: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fecha de Fin
                        </label>
                        <input
                            type="date"
                            value={searchParams.end_date}
                            onChange={(e) => setSearchParams(prev => ({ ...prev, end_date: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>

                {/* Coordenadas */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Coordenadas del Área (mínimo 3 puntos)
                        </label>
                        <button
                            onClick={addCoordinate}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                        >
                            Agregar Punto
                        </button>
                    </div>
                    
                    {coordinates.map((coord, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                            <span className="w-8 text-sm text-gray-600">#{index + 1}</span>
                            <input
                                type="number"
                                step="any"
                                placeholder="Latitud"
                                value={coord.lat}
                                onChange={(e) => updateCoordinate(index, 'lat', parseFloat(e.target.value) || 0)}
                                className="flex-1 p-2 border border-gray-300 rounded text-sm"
                            />
                            <input
                                type="number"
                                step="any"
                                placeholder="Longitud"
                                value={coord.lng}
                                onChange={(e) => updateCoordinate(index, 'lng', parseFloat(e.target.value) || 0)}
                                className="flex-1 p-2 border border-gray-300 rounded text-sm"
                            />
                            <button
                                onClick={() => removeCoordinate(index)}
                                className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                {/* Botón de búsqueda */}
                <button
                    onClick={searchImages}
                    disabled={loading || coordinates.length < 3}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? 'Buscando...' : 'Buscar Imágenes'}
                </button>
            </div>

            {/* Mostrar errores */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            {/* Resultados */}
            {images.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">
                        Resultados ({images.length} imágenes encontradas)
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {images.map((image) => (
                            <div key={image.id} className="border border-gray-200 rounded-lg p-4">
                                <h3 className="font-medium text-lg mb-2">{image.spacecraft}</h3>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>Fecha:</strong> {image.date}</p>
                                    <p><strong>Cobertura de nubes:</strong> {image.cloud_coverage}%</p>
                                    <p><strong>Órbita:</strong> {image.orbit}</p>
                                    <p><strong>ID del producto:</strong> {image.product_id}</p>
                                </div>
                                
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Banda a descargar:
                                    </label>
                                    <select 
                                        className="w-full p-2 border border-gray-300 rounded text-sm mb-2"
                                        onChange={(e) => setSelectedImage(e.target.value)}
                                    >
                                        <option value="">Seleccionar banda</option>
                                        {image.bands.map((band) => (
                                            <option key={band} value={`${image.id}|${band}`}>
                                                {band}
                                            </option>
                                        ))}
                                    </select>
                                    
                                    <button
                                        onClick={() => {
                                            if (selectedImage && selectedImage.startsWith(image.id)) {
                                                const band = selectedImage.split('|')[1];
                                                downloadImage(image.id, band);
                                            }
                                        }}
                                        disabled={!selectedImage || !selectedImage.startsWith(image.id)}
                                        className="w-full bg-blue-500 text-white py-1 px-3 rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
                                    >
                                        Descargar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SatelliteSearch;
