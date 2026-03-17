import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { 
    ArrowLeft, 
    Upload, 
    Users, 
    Settings, 
    Download,
    FileText,
    Map,
    Trash2,
    Edit3,
    Eye,
    Crown,
    UserPlus,
    MoreVertical,
    Image as ImageIcon,
    Camera,
    ExternalLink,
    Activity
} from 'lucide-react';
import { WorkspaceDetail, WorkspaceFile, WorkspaceImage } from '../types/workspace';
import { InferenceJob, aiApi } from '../services/aiApi';
import { workspaceApi } from '../services/workspaceApi';
import { imageApi } from '../services/imageApi';
import { FileUploadModal } from './FileUploadModal';
import { MembersModal } from './MembersModal';
import { FileCard } from './FileCard';
import { AreaPreviewModal } from './AreaPreviewModal';
import { EditFileModal } from './EditFileModal';
import { ImageUploadModal } from './ImageUploadModal';
import { ImageGrid } from './ImageGrid';
import { ImageEditModal } from './ImageEditModal';
import { ImageViewModal } from './ImageViewModal';
import { RenameImageModal } from './RenameImageModal';
import { DeleteImageModal } from './DeleteImageModal';
import { InferenceList } from './InferenceList';

interface WorkspaceDetailViewProps {
    workspaceId: string;
    onBack: () => void;
}

export const WorkspaceDetailView: React.FC<WorkspaceDetailViewProps> = ({
    workspaceId,
    onBack
}) => {
    const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'files' | 'images' | 'inferences'>('files');
    
    // Estados para archivos
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
    const [showAreaPreview, setShowAreaPreview] = useState(false);
    const [selectedFileForPreview, setSelectedFileForPreview] = useState<WorkspaceFile | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedFileForEdit, setSelectedFileForEdit] = useState<WorkspaceFile | null>(null);
    
    // Estados para imágenes
    const [images, setImages] = useState<WorkspaceImage[]>([]);
    const [imagesLoading, setImagesLoading] = useState(false);
    const [filesLoading, setFilesLoading] = useState(false);
    
    // Estados para inferencias
    const [inferences, setInferences] = useState<InferenceJob[]>([]);
    const [inferencesLoading, setInferencesLoading] = useState(false);
    const [filesMeta, setFilesMeta] = useState<{ current_page: number; per_page: number; total: number; last_page: number } | null>(null);
    const [filesPage, setFilesPage] = useState(1);
    const [inferencesPage, setInferencesPage] = useState(1);
    const [inferencesMeta, setInferencesMeta] = useState<{ current_page: number; per_page: number; total: number; last_page: number } | null>(null);
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [showImageViewModal, setShowImageViewModal] = useState(false);
    const [showImageEditModal, setShowImageEditModal] = useState(false);
    const [showImageRenameModal, setShowImageRenameModal] = useState(false);
    const [showImageDeleteModal, setShowImageDeleteModal] = useState(false);
    const [selectedImageForView, setSelectedImageForView] = useState<WorkspaceImage | null>(null);
    const [selectedImageForEdit, setSelectedImageForEdit] = useState<WorkspaceImage | null>(null);
    const [selectedImageForRename, setSelectedImageForRename] = useState<WorkspaceImage | null>(null);
    const [selectedImageForDelete, setSelectedImageForDelete] = useState<WorkspaceImage | null>(null);

    useEffect(() => {
        loadWorkspace();
        loadImages(); // Cargar imágenes siempre al cargar el workspace
    }, [workspaceId]);

    // Cargar archivos cuando se entra a la pestaña 'files' y aún no han sido cargados
    useEffect(() => {
        if (activeTab !== 'files') return;
        // Si ya tenemos archivos cargados o estamos en medio de una carga, no hacer nada
        if (filesLoading) return;
        if (filesMeta !== null) return; // Previene loops si el workspace tiene 0 archivos
        if (workspace && workspace.files && workspace.files.length > 0) return;

        // Cargar primera página de archivos
        loadFiles();
        // Dependencias estrictas para evitar re-renderizados infinitos con espacios vacíos
    }, [activeTab, filesLoading, filesMeta, workspace?.files?.length]);

    useEffect(() => {
        // Recargar imágenes solo cuando se cambia específicamente a la pestaña de imágenes
        // y no hemos cargado imágenes recientemente
        if (activeTab === 'images' && images.length === 0 && !imagesLoading) {
            loadImages();
        }

        if (activeTab === 'inferences' && inferences.length === 0 && !inferencesLoading) {
            loadInferences(1);
        }
    }, [activeTab]);

    const loadWorkspace = async () => {
        try {
            setLoading(true);
            const data = await workspaceApi.getWorkspace(workspaceId);
            setWorkspace(data);
            setError(null);
        } catch (err) {
            setError('Error al cargar el espacio de trabajo');
            console.error('Error loading workspace:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadImages = async () => {
        try {
            setImagesLoading(true);
            const data = await imageApi.getImages(workspaceId, { per_page: 50 });
            setImages(data.images);
        } catch (err) {
            console.error('Error loading images:', err);
        } finally {
            setImagesLoading(false);
        }
    };

    const loadFiles = async (page = 1, perPage = 20) => {
        try {
            setFilesLoading(true);
            const data = await workspaceApi.getFiles(workspaceId, { 
                page, 
                per_page: perPage,
                include: ['metadata', 'coordinates']
            });
            // data: { files, meta }
            setFilesMeta(data.meta || null);

            setWorkspace(prev => {
                if (!prev) return prev;
                const existing = prev.files || [];
                // If loading first page replace, otherwise append
                const newFiles = page === 1 ? data.files : [...existing, ...data.files];
                return { ...prev, files: newFiles };
            });

            setFilesPage(page);
        } catch (err) {
            console.error('Error loading files:', err);
        } finally {
            setFilesLoading(false);
        }
    };

    const loadInferences = async (page = 1, perPage = 10) => {
        try {
            setInferencesLoading(true);
            const data = await aiApi.getInferences(workspaceId, page, perPage);
            
            setInferences(data.data);
            setInferencesMeta(data.meta || null);
            setInferencesPage(page);
        } catch (err) {
            console.error('Error loading inferences:', err);
        } finally {
            setInferencesLoading(false);
        }
    };

    const handleFileUpload = async (fileData: { file: File; name?: string }) => {
        try {
            const newFile = await workspaceApi.uploadFile(workspaceId, fileData);
            setWorkspace(prev => prev ? {
                ...prev,
                files: [newFile, ...prev.files]
            } : null);
            setShowUploadModal(false);
        } catch (err) {
            console.error('Error uploading file:', err);
            alert('Error al subir el archivo');
        }
    };

    const handleFileDelete = async (fileId: number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
            return;
        }

        try {
            await workspaceApi.deleteFile(workspaceId, fileId);
            setWorkspace(prev => prev ? {
                ...prev,
                files: prev.files.filter(f => f.id !== fileId)
            } : null);
        } catch (err) {
            console.error('Error deleting file:', err);
            alert('Error al eliminar el archivo');
        }
    };

    const handleFileDownload = async (fileId: number) => {
        try {
            await workspaceApi.downloadFile(workspaceId, fileId);
        } catch (err) {
            console.error('Error downloading file:', err);
            alert('Error al descargar el archivo');
        }
    };

    const handlePreviewAreas = (file: WorkspaceFile) => {
        setSelectedFileForPreview(file);
        setShowAreaPreview(true);
    };

    const handleEditFile = (file: WorkspaceFile) => {
        setSelectedFileForEdit(file);
        setShowEditModal(true);
    };

    const handleUpdateFile = async (newName: string, notes?: string) => {
        if (!selectedFileForEdit) return;

        try {
            const updatedFile = await workspaceApi.updateFile(
                workspaceId, 
                selectedFileForEdit.id, 
                { name: newName, processing_notes: notes }
            );

            // Actualizar el workspace con el archivo modificado
            setWorkspace(prev => {
                if (!prev) return null;
                if (!prev.files) {
                    // Files not loaded yet; nothing to update in list. Keep workspace as-is.
                    return prev;
                }
                return {
                    ...prev,
                    files: prev.files.map(f => 
                        f.id === selectedFileForEdit.id 
                            ? { ...f, name: newName, processing_notes: notes || undefined }
                            : f
                    )
                };
            });

            setShowEditModal(false);
            setSelectedFileForEdit(null);
        } catch (err) {
            console.error('Error updating file:', err);
            throw err; // Dejar que el modal maneje el error
        }
    };

    // Funciones para manejo de imágenes
    const handleImageUploadSuccess = () => {
        loadImages(); // Recargar la lista de imágenes
        setShowImageUploadModal(false);
    };

    const handleImageView = (image: WorkspaceImage) => {
        setSelectedImageForView(image);
        setShowImageViewModal(true);
    };

    const handleImageEdit = (image: WorkspaceImage) => {
        // Cerrar el modal de vista primero
        setShowImageViewModal(false);
        setSelectedImageForView(null);
        
        // Abrir el modal de edición
        setSelectedImageForEdit(image);
        setShowImageEditModal(true);
    };

    const handleImageRename = (image: WorkspaceImage) => {
        setSelectedImageForRename(image);
        setShowImageRenameModal(true);
    };

    const handleImageDelete = (image: WorkspaceImage) => {
        // Cerrar el modal de vista primero
        setShowImageViewModal(false);
        setSelectedImageForView(null);
        
        // Abrir el modal de eliminación después de un breve delay
        setTimeout(() => {
            setSelectedImageForDelete(image);
            setShowImageDeleteModal(true);
        }, 100);
    };

    const handleImageEditSuccess = (updatedImage: WorkspaceImage) => {
        setImages(prev => prev.map(img => 
            img.id === updatedImage.id ? updatedImage : img
        ));
        setShowImageEditModal(false);
        setSelectedImageForEdit(null);
    };

    const handleImageRenameSuccess = (updatedImage: WorkspaceImage) => {
        setImages(prev => prev.map(img => 
            img.id === updatedImage.id ? updatedImage : img
        ));
        setShowImageRenameModal(false);
        setSelectedImageForRename(null);
    };

    const handleImageDeleteSuccess = () => {
        if (selectedImageForDelete) {
            setImages(prev => prev.filter(img => img.id !== selectedImageForDelete.id));
        }
        setShowImageDeleteModal(false);
        setSelectedImageForDelete(null);
    };

    const handleInferenceDelete = async (jobId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta inferencia? Se borrarán permanentemente los archivos asociados en MinIO.')) {
            return;
        }

        try {
            await aiApi.deleteInference(jobId);
            setInferences(prev => prev.filter(inf => inf.job_id !== jobId));
        } catch (err) {
            console.error('Error deleting inference:', err);
            alert('Error al eliminar la inferencia');
        }
    };

    const canEdit = workspace && ['owner', 'editor'].includes(workspace.user_role);
    const canManage = workspace && workspace.user_role === 'owner';

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !workspace) {
        return (
            <div className="p-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </button>
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800">{error || 'Espacio de trabajo no encontrado'}</p>
                    <button 
                        onClick={loadWorkspace}
                        className="mt-2 text-red-600 hover:text-red-800 underline"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
                        {workspace.description && (
                            <p className="text-gray-600">{workspace.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {canEdit && (
                        <>
                            {activeTab === 'images' ? (
                                <button
                                    onClick={() => setShowImageUploadModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                    <Camera className="w-4 h-4" />
                                    Subir Imagen
                                </button>
                            ) : null}
                        </>
                    )}
                    
                    {workspace.type === 'shared' && (
                        <button
                            onClick={() => setShowMembersModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            <Users className="w-4 h-4" />
                            Miembros ({workspace.members.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Pestañas de navegación */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('files')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'files'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                            <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Archivos ({workspace.files_count})
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('images')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'images'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Imágenes ({images.length})
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('inferences')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'inferences'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Inferencias ({inferences.length})
                        </div>
                    </button>
                </nav>
            </div>

            {/* Workspace Info (removed summary cards) */}

            {/* Contenido según pestaña activa */}
            {activeTab === 'files' ? (
                /* Files Section */
                <div>
                        <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Archivos</h2>
                        {workspace.files_count > 0 && (
                            <div className="text-sm text-gray-500">
                                {workspace.files_count} archivo{workspace.files_count !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>

                    {filesLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : !workspace.files || workspace.files.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-2">No hay archivos en este espacio</p>
                            {/** Intentionally hide upload/link when on Files tab per UX requirement **/}
                        </div>
                    ) : (
                        <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workspace.files.map(file => (
                                <FileCard
                                    key={file.id}
                                    file={file}
                                    canEdit={canEdit || false}
                                    onDownload={() => handleFileDownload(file.id)}
                                    onDownloadWithMeta={async () => {
                                        const { toast } = await import('sonner');
                                        const id = toast.loading('Preparando descarga — procesando y comprimiendo...');
                                        try {
                                            await workspaceApi.downloadFileWithMetadata(workspaceId, file.id);
                                            toast.success('Descarga lista — el archivo debería comenzar en breve', { id });
                                        } catch (err) {
                                            console.error('Error downloading file with metadata:', err);
                                            toast.error('Error al descargar con metadatos', { id });
                                        }
                                    }}
                                    onDelete={() => handleFileDelete(file.id)}
                                    onPreviewAreas={() => handlePreviewAreas(file)}
                                    onEdit={() => handleEditFile(file)}
                                />
                            ))}
                        </div>

                        {filesMeta && filesMeta.current_page < filesMeta.last_page && (
                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={() => loadFiles(filesMeta.current_page + 1, filesMeta.per_page)}
                                    className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                                    disabled={filesLoading}
                                >
                                    {filesLoading ? 'Cargando...' : 'Cargar más'}
                                </button>
                            </div>
                        )}
                        </>
                    )}
                </div>
            ) : activeTab === 'images' ? (
                /* Images Section */
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Imágenes Satelitales</h2>
                        <div className="flex items-center gap-2">
                            {images.length > 0 && (
                                <div className="text-sm text-gray-500">
                                    {images.length} imagen{images.length !== 1 ? 'es' : ''}
                                </div>
                            )}
                        </div>
                    </div>

                    {imagesLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <ImageGrid
                            workspaceId={workspaceId}
                            images={images}
                            onImageSelect={handleImageView}
                            onImageEdit={handleImageEdit}
                            onImageRename={handleImageRename}
                            onImageDelete={handleImageDelete}
                            onRefresh={loadImages}
                        />
                    )}
                </div>
            ) : (
                /* Inferences Section */
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Análisis e Inferencias</h2>
                        <div className="flex items-center gap-2">
                            {inferences.length > 0 && (
                                <div className="text-sm text-gray-500">
                                    {inferences.length} análisis
                                </div>
                            )}
                        </div>
                    </div>

                    <InferenceList
                        workspaceId={workspaceId}
                        inferences={inferences}
                        loading={inferencesLoading}
                        onDelete={handleInferenceDelete}
                        onRefresh={() => loadInferences(1)}
                        meta={inferencesMeta}
                        onPageChange={loadInferences}
                    />
                </div>
            )}

            {/* Modals */}
            <FileUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSubmit={handleFileUpload}
            />

            {workspace.type === 'shared' && (
                <MembersModal
                    isOpen={showMembersModal}
                    onClose={() => setShowMembersModal(false)}
                    workspace={workspace}
                    onUpdate={loadWorkspace}
                />
            )}

            {/* Area Preview Modal */}
            {selectedFileForPreview && (
                <AreaPreviewModal
                    isOpen={showAreaPreview}
                    onClose={() => {
                        setShowAreaPreview(false);
                        setSelectedFileForPreview(null);
                    }}
                    areas={selectedFileForPreview.metadata?.frontend_data?.selectedAreas || []}
                    title={selectedFileForPreview.name}
                    description={selectedFileForPreview.metadata?.frontend_data?.description}
                    mapCenter={selectedFileForPreview.metadata?.frontend_data?.mapCenter}
                    mapZoom={selectedFileForPreview.metadata?.frontend_data?.mapZoom}
                />
            )}

            {/* Edit File Modal */}
            <EditFileModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedFileForEdit(null);
                }}
                onSave={handleUpdateFile}
                file={selectedFileForEdit}
            />

            {/* Image Upload Modal */}
            <ImageUploadModal
                workspaceId={workspaceId}
                isOpen={showImageUploadModal}
                onClose={() => setShowImageUploadModal(false)}
                onSuccess={handleImageUploadSuccess}
                allowMultiple={true}
            />

            {/* Image View Modal */}
            <ImageViewModal
                workspaceId={workspaceId}
                image={selectedImageForView}
                isOpen={showImageViewModal}
                onClose={() => {
                    setShowImageViewModal(false);
                    setSelectedImageForView(null);
                }}
                onEdit={handleImageEdit}
                onDelete={handleImageDelete}
            />

            {/* Image Edit Modal */}
            <ImageEditModal
                workspaceId={workspaceId}
                image={selectedImageForEdit}
                isOpen={showImageEditModal}
                onClose={() => {
                    setShowImageEditModal(false);
                    setSelectedImageForEdit(null);
                }}
                onSuccess={handleImageEditSuccess}
            />

            {/* Rename Image Modal */}
            <RenameImageModal
                workspaceId={workspaceId}
                image={selectedImageForRename}
                isOpen={showImageRenameModal}
                onClose={() => {
                    setShowImageRenameModal(false);
                    setSelectedImageForRename(null);
                }}
                onSuccess={handleImageRenameSuccess}
            />

            {/* Delete Image Modal */}
            <DeleteImageModal
                workspaceId={workspaceId}
                image={selectedImageForDelete}
                isOpen={showImageDeleteModal}
                onClose={() => {
                    setShowImageDeleteModal(false);
                    setSelectedImageForDelete(null);
                }}
                onSuccess={handleImageDeleteSuccess}
            />
        </div>
    );
};
