import React, { useState, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    ArrowLeft, 
    Camera, 
    RefreshCw,
    Images as ImagesIcon
} from 'lucide-react';
import { WorkspaceImage, ImageStats, Workspace } from '@/types/workspace';
import { imageApi } from '@/services/imageApi';
import { workspaceApi } from '@/services/workspaceApi';
import { ImageGrid } from '@/components/ImageGrid';
import { ImageUploadModal } from '@/components/ImageUploadModal';
import { ImageEditModal } from '@/components/ImageEditModal';
import { ImageViewModal } from '@/components/ImageViewModal';
import { RenameImageModal } from '@/components/RenameImageModal';
import { DeleteImageModal } from '@/components/DeleteImageModal';

interface WorkspaceImagesPageProps {
    workspaceId: string;
}

export default function WorkspaceImagesPage({ workspaceId }: WorkspaceImagesPageProps) {
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [images, setImages] = useState<WorkspaceImage[]>([]);
    const [stats, setStats] = useState<ImageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [imagesLoading, setImagesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para modales
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // Estados para imágenes seleccionadas
    const [selectedImageForEdit, setSelectedImageForEdit] = useState<WorkspaceImage | null>(null);
    const [selectedImageForView, setSelectedImageForView] = useState<WorkspaceImage | null>(null);
    const [selectedImageForRename, setSelectedImageForRename] = useState<WorkspaceImage | null>(null);
    const [selectedImageForDelete, setSelectedImageForDelete] = useState<WorkspaceImage | null>(null);

    const loadWorkspaceData = useCallback(async () => {
        try {
            setLoading(true);
            const [workspaceData, imagesData, statsData] = await Promise.all([
                workspaceApi.getWorkspace(workspaceId),
                imageApi.getImages(workspaceId, { per_page: 50 }),
                imageApi.getStats(workspaceId)
            ]);

            setWorkspace(workspaceData);
            setImages(imagesData.images);
            setStats(statsData);
            setError(null);
        } catch (err) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Error al cargar los datos');
            console.error('Error loading workspace data:', err);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        loadWorkspaceData();
    }, [loadWorkspaceData]);

    const loadImages = async () => {
        try {
            setImagesLoading(true);
            const data = await imageApi.getImages(workspaceId, { per_page: 50 });
            setImages(data.images);
            
            // Actualizar estadísticas también
            const statsData = await imageApi.getStats(workspaceId);
            setStats(statsData);
        } catch (err) {
            console.error('Error loading images:', err);
        } finally {
            setImagesLoading(false);
        }
    };

    const handleImageUploadSuccess = () => {
        loadImages();
        setShowUploadModal(false);
    };

    const handleImageView = (image: WorkspaceImage) => {
        setSelectedImageForView(image);
        setShowViewModal(true);
    };

    const handleImageEdit = (image: WorkspaceImage) => {
        setSelectedImageForEdit(image);
        setShowEditModal(true);
    };

    const handleImageRename = (image: WorkspaceImage) => {
        setSelectedImageForRename(image);
        setShowRenameModal(true);
    };

    const handleImageDelete = (image: WorkspaceImage) => {
        setSelectedImageForDelete(image);
        setShowDeleteModal(true);
    };

    const handleImageEditSuccess = (updatedImage: WorkspaceImage) => {
        setImages(prev => prev.map(img => 
            img.id === updatedImage.id ? updatedImage : img
        ));
        setShowEditModal(false);
        setSelectedImageForEdit(null);
    };

    const handleImageRenameSuccess = (updatedImage: WorkspaceImage) => {
        setImages(prev => prev.map(img => 
            img.id === updatedImage.id ? updatedImage : img
        ));
        setShowRenameModal(false);
        setSelectedImageForRename(null);
    };

    const handleImageDeleteSuccess = () => {
        if (selectedImageForDelete) {
            setImages(prev => prev.filter(img => img.id !== selectedImageForDelete.id));
            
            // Actualizar estadísticas
            imageApi.getStats(workspaceId).then(setStats).catch(console.error);
        }
        setShowDeleteModal(false);
        setSelectedImageForDelete(null);
    };

    const handleBackToWorkspace = () => {
        window.history.back();
    };

    const canEdit = workspace && ['owner', 'editor'].includes(workspace.user_role);

    if (loading) {
        return (
            <AppLayout>
                <Head title="Cargando..." />
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </AppLayout>
        );
    }

    if (error || !workspace) {
        return (
            <AppLayout>
                <Head title="Error" />
                <div className="p-6">
                    <Alert variant="destructive">
                        <AlertDescription>{error || 'Workspace no encontrado'}</AlertDescription>
                    </Alert>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout 
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Espacios de Trabajo', href: '/espacios-trabajo' },
                { title: workspace.name, href: '#' },
                { title: 'Imágenes', href: '#' }
            ]}
        >
            <Head title={`Imágenes - ${workspace.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg p-6">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <Button 
                                    variant="outline" 
                                    onClick={handleBackToWorkspace}
                                    className="flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Volver
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                        <ImagesIcon className="w-6 h-6" />
                                        Imágenes Satelitales
                                    </h1>
                                    <p className="text-gray-600">{workspace.name}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={loadImages}
                                    disabled={imagesLoading}
                                    className="flex items-center gap-2"
                                >
                                    <RefreshCw className={`w-4 h-4 ${imagesLoading ? 'animate-spin' : ''}`} />
                                    Actualizar
                                </Button>
                                
                                {canEdit && (
                                    <Button
                                        onClick={() => setShowUploadModal(true)}
                                        className="flex items-center gap-2"
                                    >
                                        <Camera className="w-4 h-4" />
                                        Subir Imágenes
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Estadísticas */}
                        {stats && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-600">
                                            Total de Imágenes
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-indigo-600">
                                            {stats.total_images}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-600">
                                            Tamaño Total
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">
                                            {stats.total_size_formatted}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-600">
                                            Con Coordenadas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {stats.images_with_coordinates}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {stats.total_images > 0 
                                                ? `${Math.round((stats.images_with_coordinates / stats.total_images) * 100)}%`
                                                : '0%'
                                            }
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-gray-600">
                                            Subidas Recientes
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-purple-600">
                                            {stats.recent_uploads}
                                        </div>
                                        <p className="text-xs text-gray-500">Últimos 7 días</p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid de imágenes */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Galería de Imágenes
                                </h2>
                                {images.length > 0 && (
                                    <div className="text-sm text-gray-500">
                                        {images.length} imagen{images.length !== 1 ? 'es' : ''}
                                    </div>
                                )}
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

                        {/* Modales */}
                        <ImageUploadModal
                            workspaceId={workspaceId}
                            isOpen={showUploadModal}
                            onClose={() => setShowUploadModal(false)}
                            onSuccess={handleImageUploadSuccess}
                            allowMultiple={true}
                        />

                        <ImageViewModal
                            workspaceId={workspaceId}
                            image={selectedImageForView}
                            isOpen={showViewModal}
                            onClose={() => {
                                setShowViewModal(false);
                                setSelectedImageForView(null);
                            }}
                            onEdit={handleImageEdit}
                            onDelete={handleImageDelete}
                        />

                        <ImageEditModal
                            workspaceId={workspaceId}
                            image={selectedImageForEdit}
                            isOpen={showEditModal}
                            onClose={() => {
                                setShowEditModal(false);
                                setSelectedImageForEdit(null);
                            }}
                            onSuccess={handleImageEditSuccess}
                        />

                        <RenameImageModal
                            workspaceId={workspaceId}
                            image={selectedImageForRename}
                            isOpen={showRenameModal}
                            onClose={() => {
                                setShowRenameModal(false);
                                setSelectedImageForRename(null);
                            }}
                            onSuccess={handleImageRenameSuccess}
                        />

                        <DeleteImageModal
                            workspaceId={workspaceId}
                            image={selectedImageForDelete}
                            isOpen={showDeleteModal}
                            onClose={() => {
                                setShowDeleteModal(false);
                                setSelectedImageForDelete(null);
                            }}
                            onSuccess={handleImageDeleteSuccess}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}