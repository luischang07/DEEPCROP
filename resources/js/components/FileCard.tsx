import React from 'react';
import { Download, Trash2, Map, FileText, Calendar, User, Eye, MapPin, Edit3 } from 'lucide-react';
import { WorkspaceFile } from '../types/workspace';

interface FileCardProps {
    file: WorkspaceFile;
    canEdit: boolean;
    onDownload: () => void;
    onDelete: () => void;
    onPreviewAreas?: () => void;
    onEdit?: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({
    file,
    canEdit,
    onDownload,
    onDelete,
    onPreviewAreas,
    onEdit
}) => {
    const getFileIcon = () => {
        if (file.is_tiff) {
            return <Map className="w-8 h-8 text-green-600" />;
        }
        return <FileText className="w-8 h-8 text-blue-600" />;
    };

    const getFileTypeLabel = () => {
        if (file.is_tiff) {
            return file.has_geospatial_data ? 'GeoTIFF' : 'TIFF';
        }
        return file.mime_type.split('/')[1].toUpperCase();
    };

    const hasSelectedAreas = () => {
        return file.metadata && 
               file.metadata.frontend_data && 
               file.metadata.frontend_data.selectedAreas && 
               file.metadata.frontend_data.selectedAreas.length > 0;
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon()}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate" title={file.name}>
                            {file.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate" title={file.original_name}>
                            {file.original_name}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-2">
                    {hasSelectedAreas() && onPreviewAreas && (
                        <button
                            onClick={onPreviewAreas}
                            className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                            title="Ver áreas seleccionadas"
                        >
                            <MapPin className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onDownload}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Descargar"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    {canEdit && onEdit && (
                        <button
                            onClick={onEdit}
                            className="p-1.5 text-gray-400 hover:text-yellow-600 transition-colors"
                            title="Editar nombre"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                    )}
                    {canEdit && (
                        <button
                            onClick={onDelete}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* File Info */}
            <div className="space-y-2">
                {/* Type and Size */}
                <div className="flex items-center justify-between">
                    <span className={`
                        px-2 py-1 text-xs font-medium rounded-full
                        ${file.is_tiff 
                            ? file.has_geospatial_data 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }
                    `}>
                        {getFileTypeLabel()}
                    </span>
                    <span className="text-sm text-gray-500">{file.file_size_formatted}</span>
                </div>

                {/* Selected Areas Info */}
                {hasSelectedAreas() && (
                    <div className="bg-purple-50 rounded-md p-2">
                        <div className="flex items-center gap-1 text-purple-700 text-sm">
                            <MapPin className="w-3 h-3" />
                            <span className="font-medium">Áreas Seleccionadas</span>
                        </div>
                        <div className="text-xs text-purple-600 mt-1">
                            {file.metadata.frontend_data.selectedAreas.length} área{file.metadata.frontend_data.selectedAreas.length !== 1 ? 's' : ''} guardada{file.metadata.frontend_data.selectedAreas.length !== 1 ? 's' : ''}
                            {file.metadata.frontend_data.totalArea && (
                                <span> • {file.metadata.frontend_data.totalArea > 1000000 
                                    ? `${(file.metadata.frontend_data.totalArea / 1000000).toFixed(2)} km²`
                                    : `${file.metadata.frontend_data.totalArea.toFixed(0)} m²`
                                }</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Geospatial Info */}
                {file.has_geospatial_data && file.coordinates && (
                    <div className="bg-green-50 rounded-md p-2">
                        <div className="flex items-center gap-1 text-green-700 text-sm">
                            <Map className="w-3 h-3" />
                            <span className="font-medium">Datos Geoespaciales</span>
                        </div>
                        {file.coordinates.center && (
                            <div className="text-xs text-green-600 mt-1">
                                Centro: {file.coordinates.center.lat.toFixed(4)}, {file.coordinates.center.lng.toFixed(4)}
                            </div>
                        )}
                    </div>
                )}

                {/* Processing Status */}
                {file.is_processed && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Eye className="w-3 h-3" />
                        <span>Procesado</span>
                    </div>
                )}

                {/* Uploaded by */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span>Por {file.uploaded_by.name}</span>
                </div>

                {/* Upload Date */}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>
                        {new Date(file.created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                </div>

                {/* Processing Notes */}
                {file.processing_notes && (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                        <span className="font-medium">Notas:</span> {file.processing_notes}
                    </div>
                )}
            </div>
        </div>
    );
};
