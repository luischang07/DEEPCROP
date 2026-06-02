import React, { useState } from 'react';
import { X, UserPlus, Crown, Edit, Eye, Trash2, Mail } from 'lucide-react';
import { WorkspaceDetail } from '../types/workspace';
import { workspaceApi } from '../services/workspaceApi';

interface MembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspace: WorkspaceDetail;
    onUpdate: () => void;
}

export const MembersModal: React.FC<MembersModalProps> = ({
    isOpen,
    onClose,
    workspace,
    onUpdate
}) => {
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteData, setInviteData] = useState({
        email: '',
        role: 'viewer' as 'editor' | 'viewer'
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const canManage = workspace.user_role === 'owner';

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!inviteData.email.trim()) {
            alert('El email es requerido');
            return;
        }

        setLoading(true);
        try {
            await workspaceApi.inviteUser(workspace.id, inviteData);
            setInviteData({ email: '', role: 'viewer' });
            setShowInviteForm(false);
            onUpdate();
            alert('Usuario invitado exitosamente');
        } catch (err) {
            console.error('Error inviting user:', err);
            const error = err as { response?: { data?: { message?: string } } };
            const message = error.response?.data?.message || 'Error al invitar usuario';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangeRole = async (userId: number, newRole: 'editor' | 'viewer') => {
        try {
            await workspaceApi.updateUserRole(workspace.id, userId, newRole);
            onUpdate();
        } catch (err) {
            console.error('Error updating role:', err);
            alert('Error al cambiar el rol del usuario');
        }
    };

    const handleRemoveUser = async (userId: number, userName: string) => {
        if (!confirm(`¿Estás seguro de que quieres remover a ${userName} de este espacio?`)) {
            return;
        }

        try {
            await workspaceApi.removeUser(workspace.id, userId);
            onUpdate();
        } catch (err) {
            console.error('Error removing user:', err);
            alert('Error al remover el usuario');
        }
    };

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
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Miembros del Espacio
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col max-h-[calc(80vh-120px)]">
                    {/* Actions */}
                    {canManage && (
                        <div className="p-6 border-b border-gray-200">
                            {!showInviteForm ? (
                                <button
                                    onClick={() => setShowInviteForm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Agregar Usuario
                                </button>
                            ) : (
                                <form onSubmit={handleInviteUser} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Email del Usuario
                                            </label>
                                            <input
                                                type="email"
                                                value={inviteData.email}
                                                onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="usuario@ejemplo.com"
                                                disabled={loading}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Rol
                                            </label>
                                            <select
                                                value={inviteData.role}
                                                onChange={(e) => setInviteData(prev => ({ ...prev, role: e.target.value as 'editor' | 'viewer' }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                disabled={loading}
                                            >
                                                <option value="viewer">Solo lectura</option>
                                                <option value="editor">Editor</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {loading ? 'Agregando...' : 'Agregar'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowInviteForm(false);
                                                setInviteData({ email: '', role: 'viewer' });
                                            }}
                                            disabled={loading}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Members List */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-3">
                            {workspace.members.map(member => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                                            <span className="text-white font-medium">
                                                {member.user.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">
                                                {member.user.name}
                                            </h4>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Mail className="w-3 h-3" />
                                                <span>{member.user.email}</span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Se unió el {new Date(member.joined_at).toLocaleDateString('es-ES')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Role Display/Selector */}
                                        {canManage && member.role !== 'owner' ? (
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleChangeRole(member.user.id, e.target.value as 'editor' | 'viewer')}
                                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="viewer">Solo lectura</option>
                                                <option value="editor">Editor</option>
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded border">
                                                {getRoleIcon(member.role)}
                                                <span className="text-sm font-medium">
                                                    {getRoleText(member.role)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Remove Button */}
                                        {canManage && member.role !== 'owner' && (
                                            <button
                                                onClick={() => handleRemoveUser(member.user.id, member.user.name)}
                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Remover usuario"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {workspace.members.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No hay miembros en este espacio
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
