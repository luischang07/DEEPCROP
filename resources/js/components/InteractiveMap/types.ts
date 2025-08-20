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
export type TabType = 'descarga' | 'analisis';
