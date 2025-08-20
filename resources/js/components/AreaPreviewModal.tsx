import React, { useEffect, useRef } from 'react';
import { X, MapPin, Ruler } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SelectedArea {
    type: string;
    coordinates: number[][];
    area?: number;
}

interface AreaPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    areas: SelectedArea[];
    title: string;
    description?: string;
    mapCenter?: { lat: number; lng: number };
    mapZoom?: number;
}

export const AreaPreviewModal: React.FC<AreaPreviewModalProps> = ({
    isOpen,
    onClose,
    areas,
    title,
    description,
    mapCenter,
    mapZoom
}) => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !mapContainerRef.current || areas.length === 0) return;

        // Limpiar mapa anterior si existe
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        // Crear nuevo mapa
        const map = L.map(mapContainerRef.current, {
            center: mapCenter || [0, 0],
            zoom: mapZoom || 2,
            zoomControl: true,
        });

        // Agregar capa base
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        // Agregar capa satelital como alternativa
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
            maxZoom: 19,
        });

        // Control de capas
        const baseLayers = {
            "Mapa": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
            }),
            "Satélite": satelliteLayer,
        };

        L.control.layers(baseLayers).addTo(map);

        // Crear grupo para todas las áreas
        const areasGroup = new L.FeatureGroup();
        map.addLayer(areasGroup);

        // Agregar cada área al mapa
        areas.forEach((area, index) => {
            const color = getAreaColor(index);
            
            if (area.type === 'polygon' || area.type === 'rectangle') {
                const polygon = L.polygon(
                    area.coordinates.map(coord => [coord[0], coord[1]]),
                    {
                        color: color,
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.3,
                    }
                ).addTo(areasGroup);

                // Popup con información
                const popupContent = `
                    <div class="text-sm">
                        <strong>Área ${index + 1}</strong><br>
                        <strong>Tipo:</strong> ${area.type}<br>
                        <strong>Puntos:</strong> ${area.coordinates.length}<br>
                        ${area.area ? `<strong>Área:</strong> ${formatArea(area.area)}` : ''}
                    </div>
                `;
                polygon.bindPopup(popupContent);

            } else if (area.type === 'circle' && area.coordinates.length > 0) {
                const center = area.coordinates[0];
                const marker = L.marker([center[0], center[1]], {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(areasGroup);

                const popupContent = `
                    <div class="text-sm">
                        <strong>Área ${index + 1}</strong><br>
                        <strong>Tipo:</strong> ${area.type}<br>
                        <strong>Centro:</strong> ${center[0].toFixed(6)}, ${center[1].toFixed(6)}<br>
                        ${area.area ? `<strong>Área:</strong> ${formatArea(area.area)}` : ''}
                    </div>
                `;
                marker.bindPopup(popupContent);

            } else if (area.type === 'marker' && area.coordinates.length > 0) {
                const coord = area.coordinates[0];
                const marker = L.marker([coord[0], coord[1]], {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })
                }).addTo(areasGroup);

                const popupContent = `
                    <div class="text-sm">
                        <strong>Punto ${index + 1}</strong><br>
                        <strong>Coordenadas:</strong> ${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}
                    </div>
                `;
                marker.bindPopup(popupContent);
            }
        });

        // Ajustar vista para mostrar todas las áreas
        if (areasGroup.getLayers().length > 0) {
            map.fitBounds(areasGroup.getBounds(), { padding: [20, 20] });
        }

        mapRef.current = map;

        // Cleanup
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [isOpen, areas, mapCenter, mapZoom]);

    const getAreaColor = (index: number): string => {
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
        return colors[index % colors.length];
    };

    const formatArea = (area: number): string => {
        if (area > 1000000) {
            return `${(area / 1000000).toFixed(2)} km²`;
        } else {
            return `${area.toFixed(0)} m²`;
        }
    };

    const getTotalArea = (): number => {
        return areas.reduce((sum, area) => sum + (area.area || 0), 0);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                        {description && (
                            <p className="text-gray-600 mt-1">{description}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Stats */}
                <div className="flex gap-4 p-6 border-b bg-gray-50">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{areas.length} área{areas.length !== 1 ? 's' : ''} seleccionada{areas.length !== 1 ? 's' : ''}</span>
                    </div>
                    {getTotalArea() > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Ruler className="w-4 h-4" />
                            <span>Área total: {formatArea(getTotalArea())}</span>
                        </div>
                    )}
                </div>

                {/* Map */}
                <div className="flex-1 p-6">
                    <div 
                        ref={mapContainerRef} 
                        className="w-full h-96 border border-gray-300 rounded-lg"
                        style={{ minHeight: '400px' }}
                    />
                </div>

                {/* Areas List */}
                <div className="p-6 border-t bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Áreas Detalladas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {areas.map((area, index) => (
                            <div key={index} className="bg-white p-3 rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                    <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: getAreaColor(index) }}
                                    />
                                    <span className="font-medium text-sm">Área {index + 1}</span>
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                    <div>Tipo: {area.type}</div>
                                    <div>Puntos: {area.coordinates.length}</div>
                                    {area.area && <div>Área: {formatArea(area.area)}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end p-6 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
