import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import 'leaflet-geometryutil';

// Components and utils
import { TabButtons } from './InteractiveMap/components/TabButtons';
import { DownloadTab } from './InteractiveMap/components/DownloadTab';
import { AnalysisTab } from './InteractiveMap/components/AnalysisTab';
import { SatelliteTab } from './InteractiveMap/components/SatelliteTab';
import { SaveModal } from './InteractiveMap/components/SaveModal';
import { SaveToWorkspaceModal } from './InteractiveMap/components/SaveToWorkspaceModal';
import { AreaInfoPanel } from './InteractiveMap/components/AreaInfoPanel';
import { 
    InteractiveMapProps, 
    SelectedArea, 
    TabType,
    ExportFormat
} from './InteractiveMap/types';
import { workspaceApi } from '../services/workspaceApi';
import { calculateArea, getBoundsFromCoordinates } from './InteractiveMap/utils';
import { extractImageCoordinates } from './InteractiveMap/imageMetadata';
import { 
    convertToGeoJSON, 
    convertToCSV, 
    convertToKML, 
    downloadFile, 
    generateFilename 
} from './InteractiveMap/exportUtils';
import { createTestTIFFWithMetadata } from './InteractiveMap/testUtils';

// Fix para los iconos de Leaflet en Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onAreaSelected, className = "" }) => {
    // Refs
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

    // State
    const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('descarga');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedName, setSelectedName] = useState('');
    const [startDate, setStartDate] = useState('2025-03-02');
    const [endDate, setEndDate] = useState('2025-04-02');
    const [sentinelChecked, setSentinelChecked] = useState(true);
    const [engineChecked, setEngineChecked] = useState(false);
    const [planetChecked, setPlanetChecked] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [geoJson, setGeoJson] = useState<any>(null);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('tiff');
    const [isExporting, setIsExporting] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Modal states
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [saveDescription, setSaveDescription] = useState('');
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [isUploadingToWorkspace, setIsUploadingToWorkspace] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Map initialization
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        // Inicializar el mapa
        const map = L.map(containerRef.current, {
            center: [25.0, -107.5], // Sinaloa, México como centro
            zoom: 8,
            zoomControl: true,
        });

        // Agregar capa base de OpenStreetMap
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

        // Inicializar FeatureGroup para elementos dibujados
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawnItemsRef.current = drawnItems;

        // Configurar controles de dibujo
        const drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                polygon: {
                    allowIntersection: false,
                    drawError: {
                        color: '#e1e100',
                        message: '<strong>Error:</strong> Las líneas no pueden cruzarse!'
                    },
                    shapeOptions: {
                        color: '#97009c',
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.3,
                    }
                },
                rectangle: {
                    shapeOptions: {
                        color: '#97009c',
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.3,
                    }
                },
                circle: {
                    shapeOptions: {
                        color: '#97009c',
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.3,
                    }
                },
                marker: {},
                polyline: false,
                circlemarker: false,
            },
            edit: {
                featureGroup: drawnItems,
                remove: true,
            }
        });

        map.addControl(drawControl);

        // Event listeners para dibujo
        map.on(L.Draw.Event.CREATED, (event: any) => {
            const layer = event.layer;
            const type = event.layerType;
            
            drawnItems.addLayer(layer);

            let coordinates: number[][] = [];
            let area: number | undefined;

            if (type === 'polygon' || type === 'rectangle') {
                coordinates = layer.getLatLngs()[0].map((latlng: L.LatLng) => [latlng.lat, latlng.lng]);
                area = L.GeometryUtil ? L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) : calculateArea(coordinates);
            } else if (type === 'circle') {
                const center = layer.getLatLng();
                const radius = layer.getRadius();
                coordinates = [[center.lat, center.lng]];
                area = Math.PI * radius * radius;
            } else if (type === 'marker') {
                const latlng = layer.getLatLng();
                coordinates = [[latlng.lat, latlng.lng]];
            }

            const selectedArea: SelectedArea = {
                type,
                coordinates,
                area,
            };

            setSelectedAreas(prev => [...prev, selectedArea]);
            
            if (onAreaSelected) {
                onAreaSelected(selectedArea);
            }

            // Actualizar GeoJSON para búsquedas
            if (type === 'polygon' || type === 'rectangle') {
                const geojsonFeature = {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates.map(coord => [coord[1], coord[0]])]
                    },
                    properties: {}
                };
                setGeoJson(geojsonFeature);
            }

            // Agregar popup con información
            let popupContent = `<strong>Tipo:</strong> ${type}<br>`;
            popupContent += `<strong>Coordenadas:</strong><br>`;
            coordinates.forEach((coord, index) => {
                popupContent += `${index + 1}: ${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}<br>`;
            });
            if (area) {
                if (area > 1000000) {
                    popupContent += `<strong>Área:</strong> ${(area / 1000000).toFixed(2)} km²`;
                } else {
                    popupContent += `<strong>Área:</strong> ${area.toFixed(2)} m²`;
                }
            }

            layer.bindPopup(popupContent);
        });

        map.on(L.Draw.Event.DELETED, (event: any) => {
            const layers = event.layers;
            setSelectedAreas(prev => {
                const newAreas = [...prev];
                layers.eachLayer(() => {
                    newAreas.pop(); // Simplificado, eliminar el último
                });
                return newAreas;
            });
        });

        mapRef.current = map;

        // Cleanup
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [onAreaSelected]);

    // Handlers
    const handleSearch = async () => {
        if (!geoJson) {
            alert('Por favor dibuja un área en el mapa primero');
            return;
        }

        if (!sentinelChecked && !planetChecked && !engineChecked) {
            alert('Por favor selecciona al menos un satélite');
            return;
        }

        if (!startDate || !endDate) {
            alert('Por favor selecciona un rango de fechas válido');
            return;
        }

        setIsSearching(true);
        try {
            // Acumulador de resultados
            let allResults: any[] = [];
            
            if (sentinelChecked) {
                console.log('Iniciando búsqueda de imágenes Sentinel-2...');
                try {
                    const response = await fetch('/api/satellite/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                        },
                        body: JSON.stringify({
                            coordinates: geoJson.geometry.coordinates[0],
                            start_date: startDate,
                            end_date: endDate,
                            collection: 'COPERNICUS/S2_SR_HARMONIZED'
                        })
                    });

                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Error al buscar imágenes Sentinel');
                    if (data.images && data.images.length > 0) {
                        allResults = [...allResults, ...data.images];
                    }
                } catch (e) {
                    console.error('Error Sentinel:', e);
                    alert(`Error Sentinel: ${e instanceof Error ? e.message : 'Desconocido'}`);
                }
            }

            if (engineChecked) {
                console.log('Iniciando búsqueda de imágenes Landsat-8...');
                try {
                    const response = await fetch('/api/satellite/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                        },
                        body: JSON.stringify({
                            coordinates: geoJson.geometry.coordinates[0],
                            start_date: startDate,
                            end_date: endDate,
                            collection: 'LANDSAT/LC08/C02/T1_L2'
                        })
                    });

                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Error al buscar imágenes Landsat');
                    if (data.images && data.images.length > 0) {
                        allResults = [...allResults, ...data.images];
                    }
                } catch (e) {
                    console.error('Error Landsat:', e);
                    alert(`Error Landsat: ${e instanceof Error ? e.message : 'Desconocido'}`);
                }
            }

            if (planetChecked) {
                console.log('Iniciando búsqueda de imágenes Planet Scope...');
                
                // Planet espera coordenadas GeoJSON: [[lng, lat], ...]
                const planetCoords = geoJson.geometry.coordinates[0];

                const response = await fetch('/api/satellite/planet/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                    },
                    body: JSON.stringify({
                        coordinates: planetCoords,
                        start_date: startDate,
                        end_date: endDate
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al buscar imágenes de Planet');
                }

                console.log('Imágenes de Planet encontradas:', data);
                if (data && data.length > 0) {
                    allResults = [...allResults, ...data];
                } else if (!sentinelChecked && !engineChecked) {
                    alert('No se encontraron imágenes de Planet en este rango.');
                }
            }
            
            setSearchResults(allResults);
            
            if (allResults.length > 0) {
                alert(`Se encontraron ${allResults.length} imágenes en total.`);
                setActiveTab('satelitales');
            } else if (!planetChecked || (planetChecked && !sentinelChecked && !engineChecked)) {
                // If it was already alerted for Planet, avoid double alert
                if (!(planetChecked && !sentinelChecked && !engineChecked)) {
                    alert('No se encontraron imágenes en este rango de fechas para los satélites seleccionados.');
                }
            }
        } catch (error) {
            console.error('Error fetching image data:', error);
            alert(`Error al buscar imágenes: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setIsSearching(false);
        }
    };

    const handleDownloadImage = async (imageId: string, bandName: string) => {
        try {
            console.log('Descargando imagen:', { imageId, bandName });
            
            const response = await fetch('/api/satellite/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({
                    image_id: imageId,
                    band_name: bandName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al obtener URL de descarga');
            }

            // Abrir URL de descarga en nueva ventana
            window.open(data.download_url, '_blank');
            
        } catch (error) {
            console.error('Error downloading image:', error);
            alert(`Error al descargar imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    };

    const handleOrderPlanetImage = async (image: any) => {
        try {
            const orderName = `Order_${image.id}_${new Date().getTime()}`;
            const planetCoords = geoJson.geometry.coordinates[0];

            const { toast } = await import('sonner');
            const toastId = toast.loading('Creando pedido en Planet Scope...');

            const response = await fetch('/api/satellite/planet/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({
                    name: orderName,
                    item_ids: [image.id],
                    coordinates: planetCoords
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al crear pedido');
            }

            toast.success(`Pedido creado con éxito. ID: ${data.id}`, { id: toastId });
            console.log('Orden de Planet creada:', data);
            
        } catch (error) {
            console.error('Error ordering Planet image:', error);
            alert(`Error al crear pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            console.log('=== INICIO DE PROCESAMIENTO DE ARCHIVO ===');
            console.log('Archivo seleccionado:', {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: new Date(file.lastModified).toISOString()
            });
            
            setSelectedFile(file);
            setSelectedName(file.name);
            setActiveTab('analisis');
            
            // Check if it's a GeoJSON or JSON file
            if (file.name.toLowerCase().endsWith('.geojson') || file.name.toLowerCase().endsWith('.json')) {
                console.log('=== PROCESANDO ARCHIVO GEOJSON ===');
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = e.target?.result as string;
                        const data = JSON.parse(content);
                        
                        let geometryCoords: any[] = [];
                        
                        // Extract polygon coordinates from FeatureCollection or simple Feature
                        if (data.type === 'FeatureCollection' && data.features && data.features.length > 0) {
                            const feature = data.features.find((f: any) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
                            if (feature) {
                                if (feature.geometry.type === 'Polygon') {
                                    geometryCoords = feature.geometry.coordinates[0];
                                } else if (feature.geometry.type === 'MultiPolygon') {
                                    geometryCoords = feature.geometry.coordinates[0][0]; // take the first polygon
                                }
                            }
                        } else if (data.type === 'Feature' && data.geometry) {
                            if (data.geometry.type === 'Polygon') {
                                geometryCoords = data.geometry.coordinates[0];
                            } else if (data.geometry.type === 'MultiPolygon') {
                                geometryCoords = data.geometry.coordinates[0][0];
                            }
                        } else if (data.type === 'Polygon' && data.coordinates) {
                            geometryCoords = data.coordinates[0];
                        }

                        if (geometryCoords && geometryCoords.length > 2) {
                            // GeoJSON uses [lng, lat], we need [lat, lng] for Leaflet
                            const leafletCoords = geometryCoords.map((c: number[]) => [c[1], c[0]]);
                            
                            // Calculate center
                            const centerLat = leafletCoords.reduce((sum: number, c: number[]) => sum + c[0], 0) / leafletCoords.length;
                            const centerLng = leafletCoords.reduce((sum: number, c: number[]) => sum + c[1], 0) / leafletCoords.length;

                            const coordinateData = {
                                lat: centerLat,
                                lng: centerLng,
                                zoom: 14,
                                coordinates: leafletCoords
                            };

                            renderCoordinatesOnMap(coordinateData, file.name);
                        } else {
                            alert('No se encontraron polígonos válidos en el archivo GeoJSON.');
                        }
                    } catch (err) {
                        console.error('Error parsing GeoJSON:', err);
                        alert('Error al leer el archivo GeoJSON. Asegúrate de que tenga un formato válido.');
                    }
                };
                reader.readAsText(file);
                return; // Stop here, no need to extract image coordinates
            }

            // Auto-seleccionar coordenadas y ajustar zoom para imágenes
            try {
                const coordinateData = await extractImageCoordinates(file);
                renderCoordinatesOnMap(coordinateData, file.name);
            } catch (error) {
                console.error('=== ERROR PROCESANDO COORDENADAS ===');
                console.error('Error details:', error);
                console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
            }
            
            console.log('=== FIN DE PROCESAMIENTO DE ARCHIVO ===');
        }
    };

    const renderCoordinatesOnMap = (coordinateData: any, sourceName: string) => {
        if (coordinateData && mapRef.current) {
            console.log('=== DATOS DE COORDENADAS ENCONTRADOS ===');
            console.log('Tipo de datos:', typeof coordinateData);
            console.log('Propiedades:', Object.keys(coordinateData));
            console.log('Lat:', coordinateData.lat);
            console.log('Lng:', coordinateData.lng);
            console.log('Zoom:', coordinateData.zoom);
            console.log('Coordinates array:', coordinateData.coordinates);
            console.log('Coordinates length:', coordinateData.coordinates?.length);
            
            if (coordinateData.coordinates && coordinateData.coordinates.length > 2) {
                // Si hay coordenadas de polígono, crear el polígono
                console.log('=== CREANDO POLÍGONO ===');
                console.log('Coordenadas del polígono:', coordinateData.coordinates);
                
                if (drawnItemsRef.current) {
                    // Limpiar elementos previos
                    drawnItemsRef.current.clearLayers();
                    setSelectedAreas([]);
                    console.log('Layers limpiados');
                    
                    // Crear el polígono
                    const polygon = L.polygon(coordinateData.coordinates.map((coord: number[]) => [coord[0], coord[1]]), {
                        color: '#97009c',
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.3,
                    }).addTo(drawnItemsRef.current);
                    console.log('Polígono creado y agregado al mapa');
                    
                    // Agregar popup con información
                    const popupContent = `
                        <strong>Área desde:</strong> ${sourceName}<br>
                        <strong>Coordenadas:</strong> ${coordinateData.coordinates.length} puntos<br>
                        <strong>Centro:</strong> ${coordinateData.lat.toFixed(6)}, ${coordinateData.lng.toFixed(6)}
                    `;
                    polygon.bindPopup(popupContent);
                    console.log('Popup agregado al polígono');
                    
                    // Calcular área usando GeometryUtil si está disponible
                    const polygonLatLngs = polygon.getLatLngs()[0] as L.LatLng[];
                    const area = L.GeometryUtil ? 
                        L.GeometryUtil.geodesicArea(polygonLatLngs) : 
                        calculateArea(coordinateData.coordinates);
                    console.log('Área calculada:', area);
                    
                    // Actualizar estado
                    const selectedArea = {
                        type: 'polygon',
                        coordinates: coordinateData.coordinates,
                        area: area
                    };
                    
                    setSelectedAreas([selectedArea]);
                    if (onAreaSelected) {
                        onAreaSelected(selectedArea);
                    }
                    console.log('Estado actualizado con área seleccionada');
                    
                    // Ajustar vista al polígono
                    const bounds = L.latLngBounds(coordinateData.coordinates.map((coord: number[]) => [coord[0], coord[1]]));
                    mapRef.current.fitBounds(bounds, { padding: [20, 20] });
                    console.log('=== AUTO-ZOOM APLICADO ===');
                    console.log('Bounds:', bounds);
                    
                    // Actualizar GeoJSON para búsquedas
                    const geojsonFeature = {
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [coordinateData.coordinates.map((coord: number[]) => [coord[1], coord[0]])]
                        },
                        properties: {}
                    };
                    setGeoJson(geojsonFeature);
                    console.log('GeoJSON actualizado para búsquedas');
                }
            } else {
                // Si solo hay coordenadas de centro, hacer zoom a esa ubicación
                console.log('=== CREANDO MARCADOR DE CENTRO ===');
                console.log('Coordenadas de centro:', coordinateData.lat, coordinateData.lng);
                const zoom = coordinateData.zoom || 15;
                mapRef.current.setView([coordinateData.lat, coordinateData.lng], zoom);
                console.log('Vista del mapa ajustada a:', [coordinateData.lat, coordinateData.lng], 'zoom:', zoom);
                
                // Agregar un marcador en el centro
                if (drawnItemsRef.current) {
                    drawnItemsRef.current.clearLayers();
                    setSelectedAreas([]);
                    
                    const marker = L.marker([coordinateData.lat, coordinateData.lng])
                        .addTo(drawnItemsRef.current);
                    
                    marker.bindPopup(`
                        <strong>Ubicación cargada:</strong> ${sourceName}<br>
                        <strong>Coordenadas:</strong> ${coordinateData.lat.toFixed(6)}, ${coordinateData.lng.toFixed(6)}
                    `);
                    console.log('Marcador creado en:', [coordinateData.lat, coordinateData.lng]);
                    
                    // Actualizar estado
                    const selectedArea = {
                        type: 'marker',
                        coordinates: [[coordinateData.lat, coordinateData.lng]]
                    };
                    
                    setSelectedAreas([selectedArea]);
                    if (onAreaSelected) {
                        onAreaSelected(selectedArea);
                    }
                    console.log('Estado actualizado con marcador');
                }
            }
        } else {
            console.log('=== NO SE ENCONTRARON COORDENADAS ===');
            console.log('coordinateData es null o undefined');
            console.log('mapRef.current existe:', !!mapRef.current);
        }
    };

    const handleGenerateMap = () => {
        if (selectedFile) {
            alert('Generando mapa de análisis...');
        } else {
            alert('Por favor selecciona un archivo primero');
        }
    };

    const handleSaveImage = async () => {
        if (selectedAreas.length === 0) {
            alert('Por favor selecciona un área en el mapa primero');
            return;
        }

        try {
            const imageUrl = await generateAreaPreview();
            setPreviewImageUrl(imageUrl);
            
            const now = new Date();
            const defaultTitle = `Área ${selectedAreas.length} - ${now.toLocaleDateString()}`;
            setSaveTitle(defaultTitle);
            setSaveDescription('');
            
            setShowSaveModal(true);
        } catch (error) {
            console.error('Error generating preview:', error);
            alert('Error al generar la vista previa del área');
        }
    };

    // Listen for external load-coordinates events (from the upload panel)
    useEffect(() => {
        const handler = (ev: any) => {
            try {
                const detail = ev.detail;
                const coordinateData = detail?.coordinateData;

                if (!coordinateData) return;
                if (!mapRef.current) {
                    console.warn('Map not initialized yet, skipping external coordinate load');
                    return;
                }

                console.log('Received external coordinate load:', detail);

                // Ensure drawnItemsRef exists and is attached to map
                if (!drawnItemsRef.current) {
                    drawnItemsRef.current = new L.FeatureGroup();
                    mapRef.current.addLayer(drawnItemsRef.current);
                }

                // Clear previous layers safely
                try {
                    drawnItemsRef.current.clearLayers();
                } catch (e) {
                    console.warn('Could not clear drawnItemsRef layers', e);
                }
                setSelectedAreas([]);

                // Helper to sanitize coordinate arrays into [lat:number, lng:number]
                const sanitizeCoords = (coords: any[]): number[][] => {
                    const out: number[][] = [];
                    for (const c of coords) {
                        if (!Array.isArray(c) || c.length < 2) continue;
                        const lat = Number(c[0]);
                        const lng = Number(c[1]);
                        if (!isFinite(lat) || !isFinite(lng)) continue;
                        out.push([lat, lng]);
                    }
                    return out;
                };

                if (coordinateData.type === 'polygon' && Array.isArray(coordinateData.coordinates)) {
                    const rawCoords = coordinateData.coordinates;
                    const coords = sanitizeCoords(rawCoords);
                    if (coords.length < 3) {
                        console.warn('Sanitized coordinates are insufficient for polygon:', coords);
                        return;
                    }

                    const coordsTuples = coords.map((c: number[]) => [c[0], c[1]] as [number, number]);
                    let polygon: L.Polygon | null = null;
                    try {
                        polygon = L.polygon(coordsTuples, {
                            color: '#97009c',
                            weight: 3,
                            opacity: 0.8,
                            fillOpacity: 0.3,
                        }).addTo(drawnItemsRef.current as L.FeatureGroup);
                    } catch (e) {
                        console.error('Error creating polygon on map', e);
                        return;
                    }

                    const polygonLatLngs = (polygon.getLatLngs()[0] || []) as L.LatLng[];
                    const area = L.GeometryUtil ? L.GeometryUtil.geodesicArea(polygonLatLngs) : calculateArea(coords);

                    const selectedArea = {
                        type: 'polygon',
                        coordinates: coords,
                        area: area
                    };
                    setSelectedAreas([selectedArea]);
                    if (onAreaSelected) onAreaSelected(selectedArea);

                    try {
                        const bounds = L.latLngBounds(coordsTuples as [number, number][]);
                        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
                    } catch (e) {
                        console.warn('Could not fit bounds to polygon', e);
                    }

                    try {
                        setGeoJson({
                            type: 'Feature',
                            geometry: {
                                type: 'Polygon',
                                coordinates: [coords.map((coord: any) => [coord[1], coord[0]])]
                            },
                            properties: {}
                        });
                    } catch (e) {
                        console.warn('Could not set GeoJSON safely', e);
                    }

                } else if (coordinateData.type === 'marker' && coordinateData.center) {
                    const lat = Number(coordinateData.center.lat);
                    const lng = Number(coordinateData.center.lng);
                    if (!isFinite(lat) || !isFinite(lng)) {
                        console.warn('Invalid marker coordinates received', coordinateData.center);
                        return;
                    }

                    try {
                        const marker = L.marker([lat, lng]).addTo(drawnItemsRef.current as L.FeatureGroup);
                        marker.bindPopup(`<strong>Ubicación cargada:</strong> ${detail.fileName || detail.fileId}`);

                        const selectedArea = {
                            type: 'marker',
                            coordinates: [[lat, lng]]
                        };
                        setSelectedAreas([selectedArea]);
                        if (onAreaSelected) onAreaSelected(selectedArea);

                        try {
                            mapRef.current.setView([lat, lng], coordinateData.center.zoom || 15);
                        } catch (e) {
                            console.warn('Could not set map view to marker', e);
                        }
                    } catch (e) {
                        console.error('Error adding marker to map', e);
                    }
                }
            } catch (error) {
                console.error('Error handling external coordinates', error);
            }
        };

        window.addEventListener('deepcrop:load-coordinates', handler as EventListener);
        return () => window.removeEventListener('deepcrop:load-coordinates', handler as EventListener);
    }, [onAreaSelected]);

    const generateAreaPreview = async (): Promise<string> => {
        return new Promise((resolve, reject) => {
            try {
                if (!mapRef.current || selectedAreas.length === 0) {
                    reject(new Error('No map or areas available'));
                    return;
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                canvas.width = 400;
                canvas.height = 300;

                ctx.fillStyle = '#f0f9ff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const lastArea = selectedAreas[selectedAreas.length - 1];
                const bounds = getBoundsFromCoordinates(lastArea.coordinates);
                
                if (!bounds) {
                    reject(new Error('Could not get bounds'));
                    return;
                }

                ctx.strokeStyle = '#3b82f6';
                ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
                ctx.lineWidth = 3;

                const padding = 40;
                const drawWidth = canvas.width - 2 * padding;
                const drawHeight = canvas.height - 2 * padding;

                const latRange = bounds.north - bounds.south;
                const lngRange = bounds.east - bounds.west;

                ctx.beginPath();
                lastArea.coordinates.forEach((coord: number[], index: number) => {
                    const x = padding + ((coord[1] - bounds.west) / lngRange) * drawWidth;
                    const y = padding + ((bounds.north - coord[0]) / latRange) * drawHeight;
                    
                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#1f2937';
                ctx.font = '14px system-ui';
                ctx.textAlign = 'center';
                ctx.fillText('Área Seleccionada', canvas.width / 2, 25);

                ctx.font = '12px system-ui';
                const areaText = lastArea.area 
                    ? lastArea.area > 1000000 
                        ? `${(lastArea.area / 1000000).toFixed(2)} km²`
                        : `${lastArea.area.toFixed(0)} m²`
                    : 'Área calculada';
                ctx.fillText(areaText, canvas.width / 2, canvas.height - 15);

                const imageUrl = canvas.toDataURL('image/png');
                resolve(imageUrl);

            } catch (error) {
                reject(error);
            }
        });
    };

    const handleSaveToWorkspace = async (workspaceId: string) => {
        if (!saveTitle.trim()) {
            alert('Por favor ingresa un título');
            return;
        }

        if (!previewImageUrl || selectedAreas.length === 0) {
            alert('No hay área seleccionada para guardar');
            return;
        }

        try {
            // Convertir la imagen a Blob
            const response = await fetch(previewImageUrl);
            const blob = await response.blob();
            
            // Crear un archivo con un nombre descriptivo
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${saveTitle.trim()}_${timestamp}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            // Preparar metadata con las áreas seleccionadas
            const metadata = {
                selectedAreas: selectedAreas,
                description: saveDescription.trim(),
                mapCenter: mapRef.current ? {
                    lat: mapRef.current.getCenter().lat,
                    lng: mapRef.current.getCenter().lng
                } : null,
                mapZoom: mapRef.current ? mapRef.current.getZoom() : null,
                totalArea: selectedAreas.reduce((sum, area) => sum + (area.area || 0), 0),
                createdAt: new Date().toISOString()
            };

            // Subir el archivo al workspace con metadata
            setUploadProgress(0);
            setIsUploadingToWorkspace(true);
            await workspaceApi.uploadFile(
                workspaceId,
                {
                    file,
                    name: saveTitle.trim(),
                    metadata: JSON.stringify(metadata)
                },
                (progressEvent: ProgressEvent) => {
                    if (progressEvent.lengthComputable) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                }
            );

            setIsUploadingToWorkspace(false);
            setShowSaveModal(false);
            setSaveTitle('');
            setSaveDescription('');
            setPreviewImageUrl(null);

            alert('Imagen y áreas seleccionadas guardadas exitosamente en el espacio de trabajo');

        } catch (error) {
            console.error('Error saving to workspace:', error);
            alert('Error al guardar la imagen en el espacio de trabajo');
        }
    };

    const handleCancelSave = () => {
        setShowSaveModal(false);
        setSaveTitle('');
        setSaveDescription('');
        setPreviewImageUrl(null);
    };

    const handleExportArea = async () => {
        if (!geoJson || selectedAreas.length === 0) {
            alert('Por favor selecciona un área en el mapa primero');
            return;
        }

        setIsExporting(true);
        try {
            let content: string;
            let filename: string;
            let mimeType: string;

            switch (exportFormat) {
                case 'geojson':
                    content = JSON.stringify(convertToGeoJSON(selectedAreas), null, 2);
                    filename = generateFilename('areas_deepcrop', 'geojson');
                    mimeType = 'application/geo+json';
                    break;

                case 'csv':
                    content = convertToCSV(selectedAreas);
                    filename = generateFilename('areas_deepcrop', 'csv');
                    mimeType = 'text/csv';
                    break;

                case 'kml':
                    content = convertToKML(selectedAreas);
                    filename = generateFilename('areas_deepcrop', 'kml');
                    mimeType = 'application/vnd.google-earth.kml+xml';
                    break;

                case 'tiff':
                case 'png':
                case 'jpg':
                    // Para formatos de imagen, implementar captura del mapa
                    await handleImageExport(exportFormat);
                    return;

                default:
                    throw new Error(`Formato de exportación no soportado: ${exportFormat}`);
            }

            downloadFile(content, filename, mimeType);
            
            const formatNames: { [key: string]: string } = {
                'geojson': 'GeoJSON',
                'csv': 'CSV',
                'kml': 'KML',
                'tiff': 'TIFF',
                'png': 'PNG',
                'jpg': 'JPG'
            };

            alert(`Área exportada exitosamente en formato ${formatNames[exportFormat]} como ${filename}`);

        } catch (error) {
            console.error('Error exporting area:', error);
            alert('Error al exportar el área. Por favor intenta nuevamente.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImageExport = async (format: 'tiff' | 'png' | 'jpg') => {
        if (!mapRef.current || selectedAreas.length === 0) {
            throw new Error('No hay mapa o áreas disponibles para exportar');
        }

        try {
            // Obtener las dimensiones del área seleccionada
            const lastArea = selectedAreas[selectedAreas.length - 1];
            const bounds = getBoundsFromCoordinates(lastArea.coordinates);
            
            if (!bounds) {
                throw new Error('No se pudieron obtener los límites del área');
            }

            // Si es TIFF, usar la función especializada que incluye metadatos DEEPCROP
            if (format === 'tiff') {
                await handleTIFFExportWithMetadata(lastArea, bounds);
                return;
            }

            // Para PNG y JPG, usar el método canvas existente
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error('No se pudo crear el contexto del canvas');
            }

            // Configurar las dimensiones del canvas
            const canvasSize = 1024;
            canvas.width = canvasSize;
            canvas.height = canvasSize;

            // Fondo blanco para JPG
            if (format === 'jpg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Dibujar información del área
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 16px system-ui';
            ctx.textAlign = 'center';
            
            const title = `Área Exportada - DEEPCROP`;
            ctx.fillText(title, canvas.width / 2, 30);
            
            ctx.font = '12px system-ui';
            const info = [
                `Tipo: ${lastArea.type}`,
                `Coordenadas: ${lastArea.coordinates.length} puntos`,
                lastArea.area ? 
                    `Área: ${lastArea.area > 1000000 ? 
                        `${(lastArea.area / 1000000).toFixed(2)} km²` : 
                        `${lastArea.area.toFixed(2)} m²`}` : 
                    'Área: N/A',
                `Fecha: ${new Date().toLocaleDateString()}`,
                `Formato: ${format.toUpperCase()}`
            ];
            
            info.forEach((line, index) => {
                ctx.fillText(line, canvas.width / 2, 60 + (index * 20));
            });

            // Dibujar el área seleccionada
            const padding = 100;
            const drawWidth = canvas.width - 2 * padding;
            const drawHeight = canvas.height - 2 * padding - 200; // Espacio para texto
            
            const latRange = bounds.north - bounds.south;
            const lngRange = bounds.east - bounds.west;

            // Configurar estilos de dibujo
            ctx.strokeStyle = '#97009c';
            ctx.fillStyle = 'rgba(151, 0, 156, 0.3)';
            ctx.lineWidth = 3;

            // Dibujar el área
            ctx.beginPath();
            lastArea.coordinates.forEach((coord: number[], index: number) => {
                const x = padding + ((coord[1] - bounds.west) / lngRange) * drawWidth;
                const y = padding + 150 + ((bounds.north - coord[0]) / latRange) * drawHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            if (lastArea.type !== 'marker') {
                ctx.closePath();
                ctx.fill();
            }
            ctx.stroke();

            // Agregar puntos de coordenadas
            ctx.fillStyle = '#97009c';
            lastArea.coordinates.forEach((coord: number[], index: number) => {
                const x = padding + ((coord[1] - bounds.west) / lngRange) * drawWidth;
                const y = padding + 150 + ((bounds.north - coord[0]) / latRange) * drawHeight;
                
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fill();
                
                // Etiquetar puntos importantes
                if (index === 0 || index === Math.floor(lastArea.coordinates.length / 2)) {
                    ctx.fillStyle = '#333333';
                    ctx.font = '10px system-ui';
                    ctx.fillText(`${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}`, x + 10, y - 10);
                    ctx.fillStyle = '#97009c';
                }
            });

            // Convertir canvas a blob y descargar
            canvas.toBlob((blob) => {
                if (!blob) {
                    throw new Error('No se pudo generar la imagen');
                }
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = generateFilename('area_mapa_deepcrop', format);
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => URL.revokeObjectURL(url), 100);
                
            }, `image/${format === 'jpg' ? 'jpeg' : format}`, format === 'jpg' ? 0.9 : 1.0);

        } catch (error) {
            throw error;
        }
    };

    const handleTIFFExportWithMetadata = async (area: SelectedArea, bounds: any) => {
        try {
            console.log('=== EXPORTANDO TIFF CON METADATOS DEEPCROP ===');
            console.log('Área a exportar:', {
                type: area.type,
                coordinates: area.coordinates,
                area: area.area,
                bounds: bounds
            });

            // Calcular el centro y zoom basándose en el área
            const centerLat = (bounds.north + bounds.south) / 2;
            const centerLng = (bounds.east + bounds.west) / 2;
            const zoom = mapRef.current?.getZoom() || 15;

            console.log('Centro calculado:', { lat: centerLat, lng: centerLng, zoom });

            // Crear el archivo TIFF con metadatos DEEPCROP usando la función del área actual
            const tiffBlob = createTestTIFFWithMetadata(
                area.coordinates,
                centerLat, 
                centerLng
            );

            console.log('Archivo TIFF generado:', {
                size: tiffBlob.size,
                type: tiffBlob.type
            });

            // Descargar el archivo
            const url = URL.createObjectURL(tiffBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = generateFilename('area_mapa_deepcrop', 'tiff');
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);

            console.log('=== TIFF EXPORTADO EXITOSAMENTE ===');

        } catch (error) {
            console.error('Error exportando TIFF con metadatos:', error);
            throw error;
        }
    };

    const handleNDVITable = () => {
        alert('Generando tabla NDVI...');
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'descarga':
                return (
                    <DownloadTab
                        sentinelChecked={sentinelChecked}
                        planetChecked={planetChecked}
                        engineChecked={engineChecked}
                        startDate={startDate}
                        endDate={endDate}
                        selectedName={selectedName}
                        isSearching={isSearching}
                        onSentinelChange={setSentinelChecked}
                        onPlanetChange={setPlanetChecked}
                        onEngineChange={setEngineChecked}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        onFileChange={handleFileChange}
                        onSearch={handleSearch}
                    />
                );
            case 'satelitales':
                return (
                    <SatelliteTab
                        searchResults={searchResults}
                        onDownloadImage={handleDownloadImage}
                        onOrderImage={handleOrderPlanetImage}
                    />
                );
            case 'analisis':
                return (
                    <AnalysisTab
                        selectedAreas={selectedAreas}
                        exportFormat={exportFormat}
                        isExporting={isExporting}
                        onExportFormatChange={setExportFormat}
                        onExportArea={handleExportArea}
                        onSaveImage={handleSaveImage}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className={`relative w-full h-full flex ${className}`}>
            {/* Sidebar */}
            <div className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col z-10">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                        <span className="text-3xl">🌱</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 leading-tight">Búsqueda de Imágenes</h2>
                        <p className="text-sm text-gray-500 mt-1">Selecciona un área y busca imágenes satelitales fácilmente.</p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <TabButtons 
                        activeTab={activeTab} 
                        onTabChange={setActiveTab} 
                    />
                    
                    <div className="flex-1 overflow-y-auto p-4">
                        {renderTabContent()}
                    </div>
                </div>
            </div>

            {/* Map container */}
            <div className="flex-1 relative">
                <div
                    ref={containerRef}
                    className="w-full h-full"
                    style={{ minHeight: '500px' }}
                />
                
                <AreaInfoPanel selectedAreas={selectedAreas} />
            </div>

            <SaveToWorkspaceModal
                isOpen={showSaveModal}
                previewImageUrl={previewImageUrl}
                saveTitle={saveTitle}
                saveDescription={saveDescription}
                selectedAreas={selectedAreas}
                onTitleChange={setSaveTitle}
                onDescriptionChange={setSaveDescription}
                onSave={handleSaveToWorkspace}
                onCancel={handleCancelSave}
                isUploading={isUploadingToWorkspace}
                uploadProgress={uploadProgress}
            />
        </div>
    );
};

export default InteractiveMap;
