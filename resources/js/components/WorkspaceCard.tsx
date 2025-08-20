import React from 'react';
import { Users, Calendar, Settings, Trash2, FileText, Crown, Edit, Eye } from 'lucide-react';
import { Workspace } from '../types/workspace';

interface WorkspaceCardProps {
    workspace: Workspace;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
    workspace,
    isSelected,
    onSelect,
    onDelete
}) => {
    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner':
                return <Crown className="w-4 h-4 text-yellow-500" />;
            case 'editor':
                return <Edit className="w-4 h-4 text-blue-500" />;
            case 'viewer':
                return <Eye className="w-4 h-4 text-gray-500" />;
            default:
                return null;
        }
    };

    const getRoleText = (role: string) => {
        switch (role) {
            case 'owner':
                return 'Propietario';
            case 'editor':
                return 'Editor';
            case 'viewer':
                return 'Solo lectura';
            default:
                return role;
        }
    };

    return (
        <div
            className={`
                relative p-4 rounded-lg border cursor-pointer transition-all duration-200
                ${isSelected 
                    ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
            `}
            onClick={onSelect}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {workspace.name}
                    </h3>
                    {workspace.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {workspace.description}
                        </p>
                    )}
                </div>

                {/* Actions */}
                {workspace.user_role === 'owner' && workspace.type !== 'personal' && (
                    <div className="ml-2 flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar espacio"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Metadata */}
            <div className="space-y-2">
                {/* Tipo y rol */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`
                            px-2 py-1 text-xs font-medium rounded-full
                            ${workspace.type === 'personal' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }
                        `}>
                            {workspace.type === 'personal' ? 'Personal' : 'Compartido'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {getRoleIcon(workspace.user_role)}
                        <span className="text-xs text-gray-600">
                            {getRoleText(workspace.user_role)}
                        </span>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{workspace.files_count} archivo{workspace.files_count !== 1 ? 's' : ''}</span>
                    </div>
                    {workspace.type === 'shared' && (
                        <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{workspace.members_count} miembro{workspace.members_count !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>

                {/* Propietario (si no es el usuario actual) */}
                {workspace.user_role !== 'owner' && (
                    <div className="text-xs text-gray-500">
                        Propietario: {workspace.owner.name}
                    </div>
                )}

                {/* Fecha de actualización */}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>
                        Actualizado {new Date(workspace.updated_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
};
