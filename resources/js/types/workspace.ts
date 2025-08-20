export interface User {
    id: number;
    name: string;
    email: string;
}

export interface Workspace {
    id: string;
    name: string;
    description?: string;
    type: 'personal' | 'shared';
    owner: User;
    user_role: 'owner' | 'editor' | 'viewer';
    files_count: number;
    members_count: number;
    created_at: string;
    updated_at: string;
}

export interface WorkspaceFile {
    id: number;
    name: string;
    original_name: string;
    file_size: number;
    file_size_formatted: string;
    mime_type: string;
    is_tiff: boolean;
    has_geospatial_data: boolean;
    coordinates?: {
        center?: { lat: number; lng: number };
        bounds?: Array<{ lat: number; lng: number }>;
    };
    is_processed: boolean;
    processing_notes?: string;
    metadata?: any;
    uploaded_by: User;
    created_at: string;
    updated_at: string;
}

export interface WorkspaceMember {
    id: number;
    user: User;
    role: 'owner' | 'editor' | 'viewer';
    joined_at: string;
}

export interface WorkspaceDetail extends Workspace {
    members: WorkspaceMember[];
    files: WorkspaceFile[];
}

export interface CreateWorkspaceData {
    name: string;
    description?: string;
    type: 'personal' | 'shared';
}

export interface InviteUserData {
    email: string;
    role: 'editor' | 'viewer';
}

export interface UpdateWorkspaceData {
    name: string;
    description?: string;
}

export interface UploadFileData {
    file: File;
    name?: string;
    metadata?: string;
}
