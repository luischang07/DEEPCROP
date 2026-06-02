import { Trash2, Map, FileText, Calendar, User, Eye, MapPin, Edit3 } from 'lucide-react';
import { WorkspaceFile } from '../types/workspace';

interface FileCardProps {
    file: WorkspaceFile;
    canEdit: boolean;
    onDownload?: () => void;
    onDownloadWithMeta?: () => void;
    onDelete: () => void;
    onPreviewAreas?: () => void;
    onEdit?: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({
    file,
    canEdit,
    onDelete,
    onPreviewAreas,
    onEdit
}) => {
    const getFileIcon = () => {
        // Intentar determinar la extensión real
        const ext = (file.original_name || '').split('.').pop()?.toLowerCase();
        const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
        const tiffExts = ['tif', 'tiff'];

        if (file.is_tiff || (ext && tiffExts.includes(ext))) {
            return <Map className="w-8 h-8 text-green-600" />;
        }

        if (ext && imageExts.includes(ext)) {
            // pequeño thumbnail inline (SVG) para imágenes
            return (
                <svg className="w-8 h-8 rounded bg-gray-100 p-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="24" height="24" rx="4" fill="#f3f4f6" />
                    <path d="M6 15l3-4 2 3 3-4 4 6H6z" fill="#60a5fa" />
                </svg>
            );
        }

        return <FileText className="w-8 h-8 text-blue-600" />;
    };

    const getFileTypeLabel = () => {
        // Preferir la extensión en original_name si está disponible
        const ext = (file.original_name || '').split('.').pop()?.toLowerCase();
        const subtype = (file.mime_type || '').split('/')[1] || '';

        if (file.is_tiff || (ext && (ext === 'tif' || ext === 'tiff'))) {
            return file.has_geospatial_data ? 'GeoTIFF' : 'TIFF';
        }

        if (ext) {
            // Normalizar jpg/jpeg
            if (ext === 'jpeg') return 'JPG';
            return ext.toUpperCase();
        }

        if (subtype) return subtype.toUpperCase();

        return 'FILE';
    };

    const hasSelectedAreas = () => {
        if (!file.metadata) return false;
        
        const checks = [
            (file.metadata.frontend_data?.selectedAreas?.length ?? 0) > 0,
            (file.metadata.selectedAreas?.length ?? 0) > 0,
            (file.metadata.coordinates?.length ?? 0) > 0,
            (file.metadata.areas?.length ?? 0) > 0,
            !!(file.metadata.geoJson || file.metadata.geometry || file.metadata.polygon)
        ];
        
        return checks.some(check => check);
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
                    {(() => {
                        const label = getFileTypeLabel();
                        // Determinar clase por categoría
                        const imgExts = ['PNG','JPG','JPEG','WEBP','GIF'];
                        const geoLabel = label.toUpperCase().includes('GEO') || label === 'GEOTIFF';
                        const tiffLabel = label === 'TIFF' || label === 'GEOTIFF';
                        let chipClass = 'bg-gray-100 text-gray-800';

                        if (tiffLabel) {
                            chipClass = file.has_geospatial_data ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
                        } else if (imgExts.includes(label)) {
                            chipClass = 'bg-blue-100 text-blue-800';
                        } else if (geoLabel) {
                            chipClass = 'bg-green-100 text-green-800';
                        }

                        return (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${chipClass}`}>
                                {label}
                            </span>
                        );
                    })()}
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
                            {(() => {
                                // Intentar obtener el número de áreas de diferentes estructuras
                                const areasCount = 
                                    file.metadata?.frontend_data?.selectedAreas?.length ||
                                    file.metadata?.selectedAreas?.length ||
                                    file.metadata?.coordinates?.length ||
                                    file.metadata?.areas?.length ||
                                    (file.metadata?.geoJson || file.metadata?.geometry || file.metadata?.polygon ? 1 : 0);
                                
                                const totalArea = 
                                    file.metadata?.frontend_data?.totalArea ||
                                    file.metadata?.totalArea ||
                                    file.metadata?.area;
                                
                                return (
                                    <>
                                        {areasCount} área{areasCount !== 1 ? 's' : ''} guardada{areasCount !== 1 ? 's' : ''}
                                        {totalArea && (
                                            <span> • {totalArea > 1000000 
                                                ? `${(totalArea / 1000000).toFixed(2)} km²`
                                                : `${totalArea.toFixed(0)} m²`
                                            }</span>
                                        )}
                                    </>
                                );
                            })()}
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
