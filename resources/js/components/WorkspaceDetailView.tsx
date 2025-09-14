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
    ExternalLink
} from 'lucide-react';
import { WorkspaceDetail, WorkspaceFile, WorkspaceImage } from '../types/workspace';
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
    const [activeTab, setActiveTab] = useState<'files' | 'images'>('files');
    
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

    useEffect(() => {
        // Recargar imágenes solo cuando se cambia específicamente a la pestaña de imágenes
        // y no hemos cargado imágenes recientemente
        if (activeTab === 'images' && images.length === 0 && !imagesLoading) {
            loadImages();
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
            setWorkspace(prev => prev ? {
                ...prev,
                files: prev.files.map(f => 
                    f.id === selectedFileForEdit.id 
                        ? { ...f, name: newName, processing_notes: notes || undefined }
                        : f
                )
            } : null);

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
        setSelectedImageForDelete(image);
        setShowImageDeleteModal(true);
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
                            <button
                                onClick={() => activeTab === 'files' ? setShowUploadModal(true) : setShowImageUploadModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                {activeTab === 'files' ? (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Subir Archivo
                                    </>
                                ) : (
                                    <>
                                        <Camera className="w-4 h-4" />
                                        Subir Imagen
                                    </>
                                )}
                            </button>
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
                            Archivos ({workspace.files.length})
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
                </nav>
            </div>

            {/* Workspace Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                        <FileText className="w-5 h-5" />
                        <span className="font-medium">Archivos</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{workspace.files.length}</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-700 mb-1">
                        <ImageIcon className="w-5 h-5" />
                        <span className="font-medium">Imágenes</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">{images.length}</p>
                </div>

                {workspace.type === 'shared' && (
                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 mb-1">
                            <Users className="w-5 h-5" />
                            <span className="font-medium">Miembros</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{workspace.members.length}</p>
                    </div>
                )}
            </div>

            {/* Contenido según pestaña activa */}
            {activeTab === 'files' ? (
                /* Files Section */
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Archivos</h2>
                        {workspace.files.length > 0 && (
                            <div className="text-sm text-gray-500">
                                {workspace.files.length} archivo{workspace.files.length !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>

                    {workspace.files.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-2">No hay archivos en este espacio</p>
                            {canEdit && (
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="text-indigo-600 hover:text-indigo-800 underline"
                                >
                                    Subir el primer archivo
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workspace.files.map(file => (
                                <FileCard
                                    key={file.id}
                                    file={file}
                                    canEdit={canEdit || false}
                                    onDownload={() => handleFileDownload(file.id)}
                                    onDelete={() => handleFileDelete(file.id)}
                                    onPreviewAreas={() => handlePreviewAreas(file)}
                                    onEdit={() => handleEditFile(file)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
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
