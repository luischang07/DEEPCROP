import axios from '../lib/axios';
import { useState } from 'react';
import { 
    WorkspaceImage, 
    UploadImageData, 
    BulkUploadImageData,
    UpdateImageData,
    ImageFilters,
    ImageListResponse,
    ImageStats,
    BulkUploadResult
} from '../types/workspace';

const API_BASE = '/api';

export const imageApi = {
    // Listar imágenes del workspace
    getImages: async (workspaceId: string, filters: ImageFilters = {}): Promise<ImageListResponse> => {
        const params = new URLSearchParams();
        
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.per_page) params.append('per_page', filters.per_page.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.tags && filters.tags.length > 0) {
            filters.tags.forEach(tag => params.append('tags[]', tag));
        }

        const response = await axios.get(
            `${API_BASE}/workspaces/${workspaceId}/images?${params.toString()}`
        );
        return response.data.data;
    },

    // Obtener detalles de una imagen específica
    getImage: async (workspaceId: string, imageId: string): Promise<WorkspaceImage> => {
        const response = await axios.get(`${API_BASE}/workspaces/${workspaceId}/images/${imageId}`);
        return response.data.data;
    },

    // Subir una imagen individual
    uploadImage: async (workspaceId: string, data: UploadImageData): Promise<WorkspaceImage> => {
        const formData = new FormData();
        formData.append('image', data.image);
        
        if (data.name) {
            formData.append('name', data.name);
        }
        
        if (data.tags && data.tags.length > 0) {
            data.tags.forEach(tag => formData.append('tags[]', tag));
        }

        const response = await axios.post(
            `${API_BASE}/workspaces/${workspaceId}/images`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    // Opcional: callback para mostrar progreso
                    if (progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        console.log(`Upload progress: ${progress}%`);
                    }
                },
            }
        );
        return response.data.data;
    },

    // Subir múltiples imágenes
    bulkUploadImages: async (workspaceId: string, data: BulkUploadImageData): Promise<BulkUploadResult> => {
        const formData = new FormData();
        
        data.images.forEach(image => {
            formData.append('images[]', image);
        });
        
        if (data.default_tags && data.default_tags.length > 0) {
            data.default_tags.forEach(tag => formData.append('default_tags[]', tag));
        }

        const response = await axios.post(
            `${API_BASE}/workspaces/${workspaceId}/images/bulk`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        console.log(`Bulk upload progress: ${progress}%`);
                    }
                },
            }
        );
        return response.data.data;
    },

    // Actualizar metadatos de una imagen
    updateImage: async (workspaceId: string, imageId: string, data: UpdateImageData): Promise<WorkspaceImage> => {
        const response = await axios.put(
            `${API_BASE}/workspaces/${workspaceId}/images/${imageId}`,
            data
        );
        return response.data.data;
    },

    // Eliminar imagen
    deleteImage: async (workspaceId: string, imageId: string): Promise<void> => {
        await axios.delete(`${API_BASE}/workspaces/${workspaceId}/images/${imageId}`);
    },

    // Obtener URL de descarga
    getDownloadUrl: async (workspaceId: string, imageId: string): Promise<{ download_url: string; filename: string; expires_at: string }> => {
        const response = await axios.get(`${API_BASE}/workspaces/${workspaceId}/images/${imageId}/download`);
        return response.data.data;
    },

    // Obtener estadísticas del workspace
    getStats: async (workspaceId: string): Promise<ImageStats> => {
        const response = await axios.get(`${API_BASE}/workspaces/${workspaceId}/images/stats`);
        return response.data.data;
    },

    // Obtener todas las tags disponibles
    getTags: async (workspaceId: string): Promise<string[]> => {
        const response = await axios.get(`${API_BASE}/workspaces/${workspaceId}/images/tags`);
        return response.data.data.tags;
    },

    // Función helper para descargar imagen
    downloadImage: async (workspaceId: string, imageId: string): Promise<void> => {
        try {
            const { download_url, filename } = await imageApi.getDownloadUrl(workspaceId, imageId);
            
            // Crear un enlace temporal para forzar la descarga
            const link = document.createElement('a');
            link.href = download_url;
            link.download = filename;
            link.target = '_blank';
            
            // Agregar al DOM temporalmente y hacer clic
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading image:', error);
            throw error;
        }
    }
};

// Hook personalizado para manejar uploads con estado
export const useImageUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const uploadImage = async (workspaceId: string, data: UploadImageData): Promise<WorkspaceImage | null> => {
        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('image', data.image);
            
            if (data.name) {
                formData.append('name', data.name);
            }
            
            if (data.tags && data.tags.length > 0) {
                data.tags.forEach(tag => formData.append('tags[]', tag));
            }

            const response = await axios.post(
                `${API_BASE}/workspaces/${workspaceId}/images`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            setUploadProgress(progress);
                        }
                    },
                }
            );

            setIsUploading(false);
            setUploadProgress(100);
            return response.data.data;
        } catch (err: any) {
            setIsUploading(false);
            setError(err.response?.data?.message || 'Error al subir la imagen');
            return null;
        }
    };

    const reset = () => {
        setIsUploading(false);
        setUploadProgress(0);
        setError(null);
    };

    return {
        uploadImage,
        isUploading,
        uploadProgress,
        error,
        reset
    };
};

export default imageApi;