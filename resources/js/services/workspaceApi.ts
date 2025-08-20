import axios from 'axios';
import { 
    Workspace, 
    WorkspaceDetail, 
    CreateWorkspaceData, 
    InviteUserData, 
    UpdateWorkspaceData,
    UploadFileData,
    WorkspaceFile 
} from '../types/workspace';

const API_BASE = '/api';

export const workspaceApi = {
    // Workspaces
    getWorkspaces: async (): Promise<Workspace[]> => {
        const response = await axios.get(`${API_BASE}/workspaces`);
        return response.data.data;
    },

    getWorkspace: async (id: string): Promise<WorkspaceDetail> => {
        const response = await axios.get(`${API_BASE}/workspaces/${id}`);
        return response.data.data;
    },

    getPersonalWorkspace: async (): Promise<WorkspaceDetail> => {
        const response = await axios.get(`${API_BASE}/workspaces/personal`);
        return response.data.data;
    },

    createWorkspace: async (data: CreateWorkspaceData): Promise<Workspace> => {
        const response = await axios.post(`${API_BASE}/workspaces`, data);
        return response.data.data;
    },

    updateWorkspace: async (id: string, data: UpdateWorkspaceData): Promise<Workspace> => {
        const response = await axios.put(`${API_BASE}/workspaces/${id}`, data);
        return response.data.data;
    },

    deleteWorkspace: async (id: string): Promise<void> => {
        await axios.delete(`${API_BASE}/workspaces/${id}`);
    },

    // Gestión de miembros
    inviteUser: async (workspaceId: string, data: InviteUserData): Promise<void> => {
        await axios.post(`${API_BASE}/workspaces/${workspaceId}/invite`, data);
    },

    updateUserRole: async (workspaceId: string, userId: number, role: 'editor' | 'viewer'): Promise<void> => {
        await axios.put(`${API_BASE}/workspaces/${workspaceId}/members/${userId}/role`, { role });
    },

    removeUser: async (workspaceId: string, userId: number): Promise<void> => {
        await axios.delete(`${API_BASE}/workspaces/${workspaceId}/members/${userId}`);
    },

    // Archivos
    getFiles: async (workspaceId: string): Promise<WorkspaceFile[]> => {
        const response = await axios.get(`${API_BASE}/workspaces/${workspaceId}/files`);
        return response.data.data;
    },

    uploadFile: async (workspaceId: string, data: UploadFileData): Promise<WorkspaceFile> => {
        const formData = new FormData();
        formData.append('file', data.file);
        if (data.name) {
            formData.append('name', data.name);
        }
        if (data.metadata) {
            formData.append('metadata', data.metadata);
        }

        const response = await axios.post(
            `${API_BASE}/workspaces/${workspaceId}/files`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data.data;
    },

    getFile: async (workspaceId: string, fileId: number): Promise<WorkspaceFile> => {
        const response = await axios.get(`${API_BASE}/workspaces/${workspaceId}/files/${fileId}`);
        return response.data.data;
    },

    downloadFile: async (workspaceId: string, fileId: number): Promise<void> => {
        const response = await axios.get(
            `${API_BASE}/workspaces/${workspaceId}/files/${fileId}/download`,
            { responseType: 'blob' }
        );
        
        // Crear URL para descarga
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // Obtener nombre del archivo desde headers
        const contentDisposition = response.headers['content-disposition'];
        let filename = 'download';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    updateFile: async (workspaceId: string, fileId: number, data: { name: string; processing_notes?: string }): Promise<WorkspaceFile> => {
        const response = await axios.put(`${API_BASE}/workspaces/${workspaceId}/files/${fileId}`, data);
        return response.data.data;
    },

    deleteFile: async (workspaceId: string, fileId: number): Promise<void> => {
        await axios.delete(`${API_BASE}/workspaces/${workspaceId}/files/${fileId}`);
    },
};
