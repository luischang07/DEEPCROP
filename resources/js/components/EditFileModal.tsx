import React, { useState, useEffect } from 'react';
import { X, Edit3, Save } from 'lucide-react';
import { WorkspaceFile } from '../types/workspace';

interface EditFileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newName: string, notes?: string) => void;
    file: WorkspaceFile | null;
}

export const EditFileModal: React.FC<EditFileModalProps> = ({
    isOpen,
    onClose,
    onSave,
    file
}) => {
    const [name, setName] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (file && isOpen) {
            setName(file.name);
            setNotes(file.processing_notes || '');
        }
    }, [file, isOpen]);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('El nombre no puede estar vacío');
            return;
        }

        setSaving(true);
        try {
            await onSave(name.trim(), notes.trim() || undefined);
            onClose();
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (!saving) {
            setName('');
            setNotes('');
            onClose();
        }
    };

    if (!isOpen || !file) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Editar Archivo</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={saving}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* File info */}
                    <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm text-gray-600">Archivo original:</div>
                        <div className="font-medium text-gray-900">{file.original_name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                            {file.file_size_formatted} • {file.mime_type}
                        </div>
                    </div>

                    {/* Name field */}
                    <div>
                        <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre del archivo *
                        </label>
                        <input
                            id="fileName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={saving}
                            placeholder="Ingresa el nombre del archivo"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:opacity-50"
                        />
                    </div>

                    {/* Notes field */}
                    <div>
                        <label htmlFor="fileNotes" className="block text-sm font-medium text-gray-700 mb-2">
                            Notas de procesamiento
                        </label>
                        <textarea
                            id="fileNotes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={saving}
                            placeholder="Agregar notas opcionales sobre el archivo"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:opacity-50 resize-none"
                        />
                    </div>

                    {/* Areas info (if exists) */}
                    {file.metadata?.frontend_data?.selectedAreas && (
                        <div className="bg-purple-50 p-3 rounded-md">
                            <div className="text-sm text-purple-700 font-medium">
                                Áreas seleccionadas guardadas
                            </div>
                            <div className="text-xs text-purple-600 mt-1">
                                {file.metadata.frontend_data.selectedAreas.length} área{file.metadata.frontend_data.selectedAreas.length !== 1 ? 's' : ''}
                                {file.metadata.frontend_data.totalArea && (
                                    <span> • {file.metadata.frontend_data.totalArea > 1000000 
                                        ? `${(file.metadata.frontend_data.totalArea / 1000000).toFixed(2)} km²`
                                        : `${file.metadata.frontend_data.totalArea.toFixed(0)} m²`
                                    }</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                    <button
                        onClick={handleClose}
                        disabled={saving}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Guardar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
