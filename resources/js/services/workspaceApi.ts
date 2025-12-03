import axios from '../lib/axios';
import JSZip from 'jszip';
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
    getFiles: async (workspaceId: string, opts?: { page?: number; per_page?: number; has_coordinates?: boolean; include?: string[] }):
        Promise<{ files: WorkspaceFile[]; meta: { current_page: number; per_page: number; total: number; last_page: number } }> => {
        const params: any = {};
        if (opts?.page) params.page = opts.page;
        if (opts?.per_page) params.per_page = opts.per_page;
        if (opts?.has_coordinates) params.has_coordinates = true;
        if (opts?.include && opts.include.length) params.include = opts.include.join(',');

        const response = await axios.get(`${API_BASE}/workspaces/${workspaceId}/files`, { params });
        // New shape: { files, meta }
        return response.data.data;
    },

    uploadFile: async (workspaceId: string, data: UploadFileData, onUploadProgress?: (progressEvent: any) => void): Promise<WorkspaceFile> => {
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
                onUploadProgress: onUploadProgress,
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

        // response.data is already a Blob when responseType='blob'
        const blob: Blob = response.data;

        // If server returned JSON (error wrapped) we'll detect it and show a message
        const contentType = blob.type || (response.headers['content-type'] || '');
        if (contentType.includes('application/json')) {
            // convert blob -> text -> parse json
            const text = await blob.text();
            try {
                const payload = JSON.parse(text);
                const message = payload.message || (payload.data && payload.data.message) || 'Error desconocido al descargar el archivo';
                throw new Error(message);
            } catch (e) {
                // if parsing fails, throw generic error with text
                throw new Error(text || 'Error al descargar archivo');
            }
        }

        // Parse filename from Content-Disposition header robustly
        const contentDisposition = response.headers['content-disposition'] || '';
        let filename = 'download';

        // RFC 5987: filename*=utf-8''some%20name.ext
        const filenameStarMatch = contentDisposition.match(/filename\*=(?:UTF-8'')?([^;\n]+)/i);
        if (filenameStarMatch) {
            try {
                filename = decodeURIComponent(filenameStarMatch[1].replace(/"/g, ''));
            } catch (e) {
                filename = filenameStarMatch[1].replace(/"/g, '');
            }
        } else {
            // fallback: filename="name.ext" or filename=name.ext
            const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        const url = window.URL.createObjectURL(new Blob([blob], { type: blob.type || 'application/octet-stream' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        // ensure link opens in same tab for some browsers
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    downloadFileWithMetadata: async (workspaceId: string, fileId: number): Promise<void> => {
        // Fetch file metadata (JSON) and the raw file blob, then build a ZIP client-side
        const [fileInfo, fileResp] = await Promise.all([
            axios.get(`${API_BASE}/workspaces/${workspaceId}/files/${fileId}`),
            axios.get(`${API_BASE}/workspaces/${workspaceId}/files/${fileId}/download`, { responseType: 'blob' }),
        ]);

        const metadata = fileInfo.data.data;
        const fileBlob: Blob = fileResp.data;

        // Build zip in browser
        const zip = new JSZip();
        // Add original file using original_name
        const originalName = metadata.original_name || `file_${fileId}`;
        zip.file(originalName, fileBlob);

        // Add metadata.json
        zip.file('metadata.json', JSON.stringify(metadata, null, 2));

        const content = await zip.generateAsync({ type: 'blob' });

        const filename = `${(metadata.name || originalName).replace(/\s+/g, '_')}_with_metadata.zip`;
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
