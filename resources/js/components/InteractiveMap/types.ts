export interface SelectedArea {
    type: string;
    coordinates: number[][];
    area?: number;
}

export interface InteractiveMapProps {
    onAreaSelected?: (area: SelectedArea) => void;
    className?: string;
}

export type ExportFormat = 'tiff' | 'jpg' | 'png' | 'geojson' | 'csv' | 'kml';
export type TabType = 'descarga' | 'analisis' | 'satelitales';

export interface SavedImage {
    id: string;
    title: string;
    description?: string;
    imageUrl: string;
    savedAt: string;
    area?: number;
    coordinates?: number[][];
}
