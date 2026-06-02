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

export interface FileMetadata {
    frontend_data?: {
        selectedAreas?: Array<{
            type: 'polygon' | 'rectangle' | 'circle' | 'marker';
            coordinates: number[][];
            area?: number;
        }>;
        description?: string;
        mapCenter?: { lat: number; lng: number } | [number, number];
        mapZoom?: number;
        totalArea?: number;
    };
    selectedAreas?: Array<{
        type: 'polygon' | 'rectangle' | 'circle' | 'marker';
        coordinates: number[][];
        area?: number;
    }>;
    coordinates?: number[][];
    areas?: Array<{
        type: 'polygon' | 'rectangle' | 'circle' | 'marker';
        coordinates: number[][];
        area?: number;
    }>;
    totalArea?: number;
    area?: number;
    geoJson?: unknown;
    geometry?: unknown;
    polygon?: unknown;
    [key: string]: unknown;
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
    metadata?: FileMetadata;
    uploaded_by: User;
    created_at: string;
    updated_at: string;
}

export interface WorkspaceImage {
    id: string;
    workspace_id: string;
    name: string;
    original_name: string;
    description?: string;
    file_path: string;
    file_size: number;
    formatted_size: string;
    mime_type: string;
    metadata?: Record<string, unknown>;
    geospatial_bounds?: number[];
    center_lat?: number;
    center_lng?: number;
    coordinates?: {
        center?: { lat: number; lng: number };
        bounds?: number[];
    };
    is_processed: boolean;
    processing_notes?: string;
    thumbnail_path?: string;
    tags: string[];
    download_url: string;
    thumbnail_url?: string;
    can_edit: boolean;
    can_delete: boolean;
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
    images?: WorkspaceImage[];
    images_count?: number;
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

export interface UploadImageData {
    image: File;
    name?: string;
    tags?: string[];
}

export interface BulkUploadImageData {
    images: File[];
    default_tags?: string[];
}

export interface UpdateImageData {
    name?: string;
    tags?: string[];
    center_lat?: number;
    center_lng?: number;
}

export interface ImageFilters {
    page?: number;
    per_page?: number;
    search?: string;
    tags?: string[];
}

export interface ImageListResponse {
    images: WorkspaceImage[];
    pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
    };
}

export interface ImageStats {
    total_images: number;
    total_size: number;
    total_size_formatted: string;
    images_by_type: Record<string, { count: number; total_size: number }>;
    images_with_coordinates: number;
    recent_uploads: number;
}

export interface BulkUploadResult {
    successful_uploads: Array<{
        index: number;
        success: boolean;
        image: WorkspaceImage;
    }>;
    failed_uploads: Array<{
        index: number;
        filename: string;
        error: string;
    }>;
}
