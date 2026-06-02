import React from 'react';
import { SavedImage } from '../types';
import { formatArea } from '../utils';

interface GalleryTabProps {
    savedImages: SavedImage[];
    onLoadImage: (image: SavedImage) => void;
    onDeleteImage: (imageId: string) => void;
}

export const GalleryTab: React.FC<GalleryTabProps> = ({
    savedImages,
    onLoadImage,
    onDeleteImage
}) => {
    const handleDelete = (imageId: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta imagen de la galería?')) {
            onDeleteImage(imageId);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Galería de Imágenes</h3>
                <span className="text-sm text-gray-500">
                    {savedImages.length} imagen{savedImages.length !== 1 ? 'es' : ''}
                </span>
            </div>

            {savedImages.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">🖼️</div>
                    <p className="text-gray-500 text-sm">
                        No hay imágenes guardadas aún.
                        <br />
                        Selecciona un área en el mapa y usa "Guardar en galería" para comenzar.
                    </p>
                </div>
            ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {savedImages.map((savedImage) => (
                        <div key={savedImage.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                            <div className="flex space-x-3">
                                <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                    <img 
                                        src={savedImage.imageUrl} 
                                        alt={savedImage.title}
                                        className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                                        onClick={() => onLoadImage(savedImage)}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-800 truncate">
                                        {savedImage.title}
                                    </h4>
                                    {savedImage.description && (
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                            {savedImage.description}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-gray-500">
                                            {new Date(savedImage.savedAt).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        {savedImage.area && (
                                            <span className="text-xs text-blue-600">
                                                {formatArea(savedImage.area)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex space-x-2 mt-2">
                                        <button 
                                            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                            onClick={() => onLoadImage(savedImage)}
                                        >
                                            📍 Cargar
                                        </button>
                                        <button 
                                            className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                                            onClick={() => handleDelete(savedImage.id)}
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
