import { SelectedArea } from './types';

/**
 * Convierte las coordenadas seleccionadas a formato GeoJSON
 */
export const convertToGeoJSON = (selectedAreas: SelectedArea[]) => {
    const features = selectedAreas.map((area, index) => {
        let geometry: any;

        switch (area.type) {
            case 'polygon':
            case 'rectangle':
                geometry = {
                    type: 'Polygon',
                    coordinates: [area.coordinates.map(coord => [coord[1], coord[0]])]
                };
                break;
            case 'circle':
                // Para círculos, convertir a polígono aproximado
                const center = area.coordinates[0];
                const numPoints = 32;
                const radius = Math.sqrt(area.area! / Math.PI) / 111000; // Aproximación de metros a grados
                const circleCoords = [];
                for (let i = 0; i < numPoints; i++) {
                    const angle = (i / numPoints) * 2 * Math.PI;
                    const lat = center[0] + radius * Math.cos(angle);
                    const lng = center[1] + radius * Math.sin(angle);
                    circleCoords.push([lng, lat]);
                }
                circleCoords.push(circleCoords[0]); // Cerrar el polígono
                geometry = {
                    type: 'Polygon',
                    coordinates: [circleCoords]
                };
                break;
            case 'marker':
                geometry = {
                    type: 'Point',
                    coordinates: [area.coordinates[0][1], area.coordinates[0][0]]
                };
                break;
            default:
                geometry = {
                    type: 'Point',
                    coordinates: [area.coordinates[0][1], area.coordinates[0][0]]
                };
        }

        return {
            type: 'Feature',
            id: index,
            properties: {
                name: `Área ${index + 1}`,
                type: area.type,
                area: area.area || null,
                areaFormatted: area.area ? 
                    area.area > 1000000 ? 
                        `${(area.area / 1000000).toFixed(2)} km²` : 
                        `${area.area.toFixed(2)} m²` 
                    : null,
                createdAt: new Date().toISOString()
            },
            geometry
        };
    });

    return {
        type: 'FeatureCollection',
        features
    };
};

/**
 * Convierte las áreas seleccionadas a formato CSV
 */
export const convertToCSV = (selectedAreas: SelectedArea[]) => {
    const headers = ['Área', 'Tipo', 'Latitud', 'Longitud', 'Área_m2', 'Área_km2', 'Coordenadas'];
    const rows = selectedAreas.map((area, index) => {
        const centerLat = area.coordinates.reduce((sum, coord) => sum + coord[0], 0) / area.coordinates.length;
        const centerLng = area.coordinates.reduce((sum, coord) => sum + coord[1], 0) / area.coordinates.length;
        
        return [
            `Área ${index + 1}`,
            area.type,
            centerLat.toFixed(6),
            centerLng.toFixed(6),
            area.area ? area.area.toFixed(2) : '',
            area.area ? (area.area / 1000000).toFixed(6) : '',
            `"${area.coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';')}"`
        ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
};

/**
 * Convierte las áreas seleccionadas a formato KML
 */
export const convertToKML = (selectedAreas: SelectedArea[]) => {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
    <name>Áreas Seleccionadas DEEPCROP</name>
    <description>Áreas seleccionadas para análisis satelital</description>
    <Style id="areaStyle">
        <LineStyle>
            <color>ff0099cc</color>
            <width>3</width>
        </LineStyle>
        <PolyStyle>
            <color>4d0099cc</color>
        </PolyStyle>
    </Style>`;

    const placemarks = selectedAreas.map((area, index) => {
        const name = `Área ${index + 1}`;
        const description = `
            <![CDATA[
            <b>Tipo:</b> ${area.type}<br/>
            <b>Área:</b> ${area.area ? 
                area.area > 1000000 ? 
                    `${(area.area / 1000000).toFixed(2)} km²` : 
                    `${area.area.toFixed(2)} m²` 
                : 'N/A'}<br/>
            <b>Coordenadas:</b> ${area.coordinates.length} puntos<br/>
            <b>Fecha:</b> ${new Date().toLocaleString()}
            ]]>
        `;

        let geometry = '';
        switch (area.type) {
            case 'polygon':
            case 'rectangle':
                const coords = area.coordinates.map(coord => `${coord[1]},${coord[0]},0`).join(' ');
                geometry = `
                <Polygon>
                    <extrude>1</extrude>
                    <altitudeMode>clampToGround</altitudeMode>
                    <outerBoundaryIs>
                        <LinearRing>
                            <coordinates>${coords} ${area.coordinates[0][1]},${area.coordinates[0][0]},0</coordinates>
                        </LinearRing>
                    </outerBoundaryIs>
                </Polygon>`;
                break;
            case 'circle':
                // Para círculos, crear un polígono aproximado
                const center = area.coordinates[0];
                const numPoints = 32;
                const radius = Math.sqrt(area.area! / Math.PI) / 111000;
                const circleCoords = [];
                for (let i = 0; i < numPoints; i++) {
                    const angle = (i / numPoints) * 2 * Math.PI;
                    const lat = center[0] + radius * Math.cos(angle);
                    const lng = center[1] + radius * Math.sin(angle);
                    circleCoords.push(`${lng},${lat},0`);
                }
                geometry = `
                <Polygon>
                    <extrude>1</extrude>
                    <altitudeMode>clampToGround</altitudeMode>
                    <outerBoundaryIs>
                        <LinearRing>
                            <coordinates>${circleCoords.join(' ')} ${circleCoords[0]}</coordinates>
                        </LinearRing>
                    </outerBoundaryIs>
                </Polygon>`;
                break;
            case 'marker':
                geometry = `
                <Point>
                    <coordinates>${area.coordinates[0][1]},${area.coordinates[0][0]},0</coordinates>
                </Point>`;
                break;
        }

        return `
        <Placemark>
            <name>${name}</name>
            <description>${description}</description>
            <styleUrl>#areaStyle</styleUrl>
            ${geometry}
        </Placemark>`;
    });

    return `${kmlHeader}
    ${placemarks.join('')}
</Document>
</kml>`;
};

/**
 * Descargar archivo con el contenido especificado
 */
export const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar la URL del objeto después de un breve retraso
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Generar nombre de archivo con timestamp
 */
export const generateFilename = (baseName: string, extension: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${baseName}_${timestamp}.${extension}`;
};
