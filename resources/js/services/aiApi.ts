import axios from '../lib/axios';

const API_BASE = '/api/ai';

export interface InferenceJob {
    job_id: string;
    workspace_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    output_path?: string;
    created_at: string;
    completed_at?: string;
    stress_severity?: string;
    anomaly_percentage?: number;
    anomaly_percentage_in_crop?: number;
    error_message?: string;
}

export const aiApi = {
    getInferences: async (workspaceId: string, page: number = 1, perPage: number = 10): Promise<{ data: InferenceJob[], meta: any }> => {
        const response = await axios.get(`${API_BASE}/inferences`, {
            params: { 
                workspace_id: workspaceId,
                page: page,
                per_page: perPage
            }
        });
        return response.data;
    },

    deleteInference: async (jobId: string): Promise<void> => {
        await axios.delete(`${API_BASE}/inference/${jobId}`);
    },

    getInferenceStatus: async (jobId: string): Promise<InferenceJob> => {
        const response = await axios.get(`${API_BASE}/status/${jobId}`);
        return response.data;
    },

    getPreviewUrl: (jobId: string, type: 'preview' | 'overlay' | 'visualization' = 'preview'): string => {
        return `${API_BASE}/preview/${jobId}?type=${type}`;
    }
};
