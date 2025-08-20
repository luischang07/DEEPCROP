import React, { useState, useEffect } from 'react';
import { SelectedArea } from '../types';
import { formatArea } from '../utils';
import { workspaceApi } from '../../../services/workspaceApi';
import { Workspace } from '../../../types/workspace';

interface SaveToWorkspaceModalProps {
    isOpen: boolean;
    previewImageUrl: string | null;
    saveTitle: string;
    saveDescription: string;
    selectedAreas: SelectedArea[];
    onTitleChange: (title: string) => void;
    onDescriptionChange: (description: string) => void;
    onSave: (workspaceId: string) => void;
    onCancel: () => void;
}

export const SaveToWorkspaceModal: React.FC<SaveToWorkspaceModalProps> = ({
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
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Cargar workspaces solo una vez cuando se abre el modal
    useEffect(() => {
        if (isOpen && workspaces.length === 0) {
            loadWorkspaces();
        }
        
        // Reset solo cuando se cierra el modal
        if (!isOpen) {
            setSelectedWorkspace(null);
        }
    }, [isOpen, workspaces.length]);

    const loadWorkspaces = async () => {
        setLoading(true);
        try {
            const workspacesData = await workspaceApi.getWorkspaces();
            console.log('Workspaces loaded:', workspacesData);
            setWorkspaces(workspacesData || []);
            
            // Seleccionar el primer workspace por defecto
            if (workspacesData && workspacesData.length > 0) {
                console.log('Setting default workspace:', workspacesData[0].id);
                setSelectedWorkspace(workspacesData[0].id);
            }
        } catch (error) {
            console.error('Error loading workspaces:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWorkspaceChange = (value: string) => {
        const workspaceId = value || null;
        console.log('Workspace selection changed:', value, 'setting to:', workspaceId);
        setSelectedWorkspace(workspaceId);
    };

    const handleSave = () => {
        if (!selectedWorkspace) {
            alert('Por favor selecciona un espacio de trabajo');
            return;
        }
        onSave(selectedWorkspace);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Guardar en Espacio de Trabajo</h3>
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
                                    alt="Vista previa"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Título */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Título *
                            </label>
                            <input
                                type="text"
                                value={saveTitle}
                                onChange={(e) => onTitleChange(e.target.value)}
                                placeholder="Ej: Análisis de vegetación - Región Norte"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción
                            </label>
                            <textarea
                                value={saveDescription}
                                onChange={(e) => onDescriptionChange(e.target.value)}
                                placeholder="Descripción opcional del área capturada..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                        </div>

                        {/* Selección de Workspace */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Espacio de Trabajo *
                            </label>
                            {loading ? (
                                <div className="text-sm text-gray-500">Cargando espacios de trabajo...</div>
                            ) : workspaces.length > 0 ? (
                                <select
                                    value={selectedWorkspace || ''}
                                    onChange={(e) => handleWorkspaceChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Seleccionar espacio de trabajo</option>
                                    {workspaces.map(workspace => (
                                        <option key={workspace.id} value={workspace.id}>
                                            {workspace.name} ({workspace.type === 'personal' ? 'Personal' : 'Compartido'})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-sm text-gray-500 p-2 border border-gray-200 rounded-md">
                                    No hay espacios de trabajo disponibles. 
                                    <br />
                                    <a href="/espacios-trabajo" className="text-blue-600 hover:underline">
                                        Crear uno nuevo
                                    </a>
                                </div>
                            )}
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
                            onClick={handleSave}
                            disabled={!saveTitle.trim() || !selectedWorkspace || loading}
                            className={`flex-1 py-2 px-4 rounded-md font-medium ${
                                (!saveTitle.trim() || !selectedWorkspace || loading)
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
