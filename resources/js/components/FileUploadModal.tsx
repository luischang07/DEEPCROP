import React, { useState } from 'react';
import { X, Upload, File } from 'lucide-react';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { file: File; name?: string }) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
    isOpen,
    onClose,
    onSubmit
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [customName, setCustomName] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        setCustomName('');
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleFileSelect(files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            handleFileSelect(files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedFile) {
            alert('Por favor selecciona un archivo');
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                file: selectedFile,
                name: customName.trim() || undefined
            });
            
            // Reset form
            setSelectedFile(null);
            setCustomName('');
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setSelectedFile(null);
            setCustomName('');
            setDragActive(false);
            onClose();
        }
    };

    const formatFileSize = (bytes: number): string => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const isValidFileType = (file: File): boolean => {
        const allowedTypes = [
            'image/tiff',
            'image/tif',
            'image/png',
            'image/jpeg',
            'image/jpg'
        ];
        return allowedTypes.includes(file.type) || 
               file.name.toLowerCase().endsWith('.tiff') ||
               file.name.toLowerCase().endsWith('.tif');
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4 border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Subir Archivo
                    </h2>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        {/* File Drop Zone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Archivo *
                            </label>
                            <div
                                className={`
                                    relative border-2 border-dashed rounded-lg p-6 text-center transition-all
                                    ${dragActive 
                                        ? 'border-indigo-500 bg-indigo-50' 
                                        : selectedFile 
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }
                                `}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                {selectedFile ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <File className="w-8 h-8 text-green-600" />
                                        <div className="text-left">
                                            <p className="font-medium text-green-900">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-sm text-green-700">
                                                {formatFileSize(selectedFile.size)}
                                            </p>
                                            {!isValidFileType(selectedFile) && (
                                                <p className="text-sm text-red-600 mt-1">
                                                    ⚠️ Tipo de archivo no soportado
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFile(null)}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-lg font-medium text-gray-900 mb-2">
                                            Arrastra un archivo aquí
                                        </p>
                                        <p className="text-sm text-gray-600 mb-4">
                                            o haz clic para seleccionar
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Formatos soportados: TIFF, PNG, JPG (máx. 100MB)
                                        </p>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    onChange={handleFileInput}
                                    accept=".tiff,.tif,.png,.jpg,.jpeg"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Custom Name */}
                        {selectedFile && (
                            <div>
                                <label htmlFor="customName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre personalizado (opcional)
                                </label>
                                <input
                                    type="text"
                                    id="customName"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder={selectedFile.name.replace(/\.[^/.]+$/, '')}
                                    disabled={loading}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Si no especificas un nombre, se usará el nombre original del archivo
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedFile || !isValidFileType(selectedFile)}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Subiendo...' : 'Subir Archivo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
