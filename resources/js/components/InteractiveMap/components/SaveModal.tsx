import React from 'react';
import { SelectedArea } from '../types';
import { formatArea } from '../utils';

interface SaveModalProps {
    isOpen: boolean;
    previewImageUrl: string | null;
    saveTitle: string;
    saveDescription: string;
    selectedAreas: SelectedArea[];
    onTitleChange: (title: string) => void;
    onDescriptionChange: (description: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

export const SaveModal: React.FC<SaveModalProps> = ({
    isOpen,
    previewImageUrl,
    saveTitle,
    saveDescription,
    selectedAreas,
    onTitleChange,
    onDescriptionChange,
    onSave,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full max-h-[80vh] overflow-y-auto" style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Guardar en Galería</h3>
                        <button 
                            onClick={onCancel}
                            className="text-gray-400 hover:text-gray-600 text-xl"
                        >
                            ×
                        </button>
                    </div>

                    {/* Vista previa de la imagen */}
                    {previewImageUrl && (
                        <div className="mb-4">
                            <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border">
                                <img 
                                    src={previewImageUrl} 
                                    alt="Vista previa del área"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>
                    )}

                    {/* Formulario */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Título *
                            </label>
                            <input 
                                type="text"
                                value={saveTitle}
                                onChange={(e) => onTitleChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ingresa un título para la imagen"
                                maxLength={100}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción
                            </label>
                            <textarea 
                                value={saveDescription}
                                onChange={(e) => onDescriptionChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="Descripción opcional del área..."
                                rows={3}
                                maxLength={500}
                            />
                        </div>

                        {/* Información del área */}
                        {selectedAreas.length > 0 && (
                            <div className="bg-gray-50 p-3 rounded-md">
                                <h4 className="text-sm font-medium text-gray-800 mb-2">Información del Área:</h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Tipo: {selectedAreas[selectedAreas.length - 1].type}</p>
                                    <p>Coordenadas: {selectedAreas[selectedAreas.length - 1].coordinates.length} puntos</p>
                                    {selectedAreas[selectedAreas.length - 1].area && (
                                        <p>
                                            Área: {formatArea(selectedAreas[selectedAreas.length - 1].area!)}
                                        </p>
                                    )}
                                    <p>Fecha: {new Date().toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botones */}
                    <div className="flex space-x-3 mt-6">
                        <button 
                            onClick={onCancel}
                            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={onSave}
                            disabled={!saveTitle.trim()}
                            className={`flex-1 py-2 px-4 rounded-md font-medium ${
                                !saveTitle.trim()
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                        >
                            💾 Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
