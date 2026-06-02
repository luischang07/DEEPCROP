import React, { useState, useEffect } from 'react';
import { Plus, Users, Folder, FolderOpen } from 'lucide-react';
import { Workspace } from '../types/workspace';
import { workspaceApi } from '../services/workspaceApi';
import { CreateWorkspaceModal } from './WorkspaceCreateModal';
import { WorkspaceCard } from './WorkspaceCard';

interface WorkspaceListProps {
    onSelectWorkspace: (workspace: Workspace) => void;
    selectedWorkspaceId?: string;
}

export const WorkspaceList: React.FC<WorkspaceListProps> = ({
    onSelectWorkspace,
    selectedWorkspaceId
}) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadWorkspaces();
    }, []);

    const loadWorkspaces = async () => {
        try {
            setLoading(true);
            const data = await workspaceApi.getWorkspaces();
            setWorkspaces(data);
            setError(null);
        } catch (err) {
            setError('Error al cargar los espacios de trabajo');
            console.error('Error loading workspaces:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWorkspace = async (workspaceData: { name: string; description?: string; type: 'personal' | 'shared' }) => {
        try {
            const newWorkspace = await workspaceApi.createWorkspace(workspaceData);
            setWorkspaces(prev => [newWorkspace, ...prev]);
            setShowCreateModal(false);
        } catch (err) {
            console.error('Error creating workspace:', err);
            alert('Error al crear el espacio de trabajo');
        }
    };

    const handleDeleteWorkspace = async (workspaceId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este espacio de trabajo? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await workspaceApi.deleteWorkspace(workspaceId);
            setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
        } catch (err) {
            console.error('Error deleting workspace:', err);
            alert('Error al eliminar el espacio de trabajo');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
                <button 
                    onClick={loadWorkspaces}
                    className="mt-2 text-red-600 hover:text-red-800 underline"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    const personalWorkspaces = workspaces.filter(w => w.type === 'personal');
    const sharedWorkspaces = workspaces.filter(w => w.type === 'shared');

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Espacios de Trabajo</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Espacio
                </button>
            </div>

            {/* Espacios Personales */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Espacio Personal</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {personalWorkspaces.map(workspace => (
                        <WorkspaceCard
                            key={workspace.id}
                            workspace={workspace}
                            isSelected={selectedWorkspaceId === workspace.id}
                            onSelect={() => onSelectWorkspace(workspace)}
                            onDelete={() => handleDeleteWorkspace(workspace.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Espacios Compartidos */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Espacios Compartidos</h2>
                    <span className="text-sm text-gray-500">({sharedWorkspaces.length})</span>
                </div>
                
                {sharedWorkspaces.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">No tienes espacios compartidos</p>
                        <p className="text-sm text-gray-500">Crea un nuevo espacio o espera a que te inviten a uno</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sharedWorkspaces.map(workspace => (
                            <WorkspaceCard
                                key={workspace.id}
                                workspace={workspace}
                                isSelected={selectedWorkspaceId === workspace.id}
                                onSelect={() => onSelectWorkspace(workspace)}
                                onDelete={() => handleDeleteWorkspace(workspace.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CreateWorkspaceModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateWorkspace}
            />
        </div>
    );
};
