import React, { useState, useEffect } from 'react';
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
    MoreVertical
} from 'lucide-react';
import { WorkspaceDetail, WorkspaceFile } from '../types/workspace';
import { workspaceApi } from '../services/workspaceApi';
import { FileUploadModal } from './FileUploadModal';
import { MembersModal } from './MembersModal';
import { FileCard } from './FileCard';
import { AreaPreviewModal } from './AreaPreviewModal';
import { EditFileModal } from './EditFileModal';

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
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
    const [showAreaPreview, setShowAreaPreview] = useState(false);
    const [selectedFileForPreview, setSelectedFileForPreview] = useState<WorkspaceFile | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedFileForEdit, setSelectedFileForEdit] = useState<WorkspaceFile | null>(null);

    useEffect(() => {
        loadWorkspace();
    }, [workspaceId]);

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
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Subir Archivo
                        </button>
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

            {/* Workspace Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                        <FileText className="w-5 h-5" />
                        <span className="font-medium">Archivos</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{workspace.files.length}</p>
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

            {/* Files Section */}
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
        </div>
    );
};
