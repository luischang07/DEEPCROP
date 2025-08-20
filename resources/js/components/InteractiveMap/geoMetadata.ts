/**
 * Sistema extendido para leer metadatos geoespaciales estándar
 * Soporta QGIS, Sentinel-2, GeoTIFF, y otros formatos geoespaciales
 */

export interface GeoMetadata {
    lat: number;
    lng: number;
    zoom?: number;
    coordinates?: number[][];
    projection?: string;
    bounds?: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
    source?: string;
    pixelSize?: number;
    bands?: number;
    dataType?: string;
}

/**
 * Extrae metadatos geoespaciales de archivos TIFF georreferenciados (QGIS, Sentinel-2, etc.)
 */
export const extractGeoTIFFMetadata = (arrayBuffer: ArrayBuffer): GeoMetadata | null => {
    try {
        const view = new DataView(arrayBuffer);
        
        // Verificar header TIFF
        const byteOrder = view.getUint16(0);
        const isLittleEndian = byteOrder === 0x4949;
        const isBigEndian = byteOrder === 0x4D4D;
        
        if (!isLittleEndian && !isBigEndian) {
            console.log('No es un archivo TIFF válido');
            return null;
        }
        
        console.log('=== EXTRAYENDO METADATOS GEOTIFF ===');
        console.log('Byte order:', isLittleEndian ? 'Little Endian' : 'Big Endian');
        
        // Leer magic number
        const magic = isLittleEndian ? view.getUint16(2, true) : view.getUint16(2, false);
        if (magic !== 42) {
            console.log('Magic number incorrecto:', magic);
            return null;
        }
        
        // Leer offset del primer IFD (Image File Directory)
        const ifdOffset = isLittleEndian ? view.getUint32(4, true) : view.getUint32(4, false);
        console.log('IFD Offset:', ifdOffset);
        
        if (ifdOffset >= view.byteLength || ifdOffset < 8) {
            console.log('Offset IFD inválido');
            return null;
        }
        
        const metadata: Partial<GeoMetadata> = {
            source: 'GeoTIFF'
        };
        
        // Leer las entradas del IFD
        const numEntries = isLittleEndian ? 
            view.getUint16(ifdOffset, true) : 
            view.getUint16(ifdOffset, false);
        
        console.log('Número de entradas IFD:', numEntries);
        
        let entryOffset = ifdOffset + 2;
        
        for (let i = 0; i < numEntries; i++) {
            const tag = isLittleEndian ? 
                view.getUint16(entryOffset, true) : 
                view.getUint16(entryOffset, false);
            
            const type = isLittleEndian ? 
                view.getUint16(entryOffset + 2, true) : 
                view.getUint16(entryOffset + 2, false);
            
            const count = isLittleEndian ? 
                view.getUint32(entryOffset + 4, true) : 
                view.getUint32(entryOffset + 4, false);
            
            const valueOffset = entryOffset + 8;
            
            switch (tag) {
                case 256: // ImageWidth
                    metadata.dataType = 'raster';
                    break;
                    
                case 270: // ImageDescription
                    const description = readString(view, valueOffset, count, isLittleEndian);
                    console.log('ImageDescription:', description);
                    
                    // Buscar coordenadas en la descripción
                    const coordMatch = description.match(/bounds=\[([^\]]+)\]/);
                    if (coordMatch) {
                        const coords = coordMatch[1].split(',').map(n => parseFloat(n.trim()));
                        if (coords.length >= 4) {
                            metadata.bounds = {
                                west: coords[0],
                                south: coords[1],
                                east: coords[2],
                                north: coords[3]
                            };
                        }
                    }
                    break;
                    
                case 33550: // ModelPixelScaleTag (GeoTIFF)
                    console.log('GeoTIFF ModelPixelScaleTag encontrado');
                    const pixelScale = readDoubleArray(view, valueOffset, count, isLittleEndian);
                    if (pixelScale.length >= 2) {
                        metadata.pixelSize = pixelScale[0]; // X pixel size
                        console.log('Pixel size:', metadata.pixelSize);
                    }
                    break;
                    
                case 33922: // ModelTiepointTag (GeoTIFF)
                    console.log('GeoTIFF ModelTiepointTag encontrado');
                    const tiepoints = readDoubleArray(view, valueOffset, count, isLittleEndian);
                    if (tiepoints.length >= 6) {
                        // Tiepoint: [I, J, K, X, Y, Z] donde I,J son pixel coords y X,Y son world coords
                        const worldX = tiepoints[3];
                        const worldY = tiepoints[4];
                        
                        // Para coordenadas geográficas (lat/lng)
                        if (Math.abs(worldX) <= 180 && Math.abs(worldY) <= 90) {
                            metadata.lng = worldX;
                            metadata.lat = worldY;
                            metadata.projection = 'WGS84';
                            console.log('Coordenadas geográficas encontradas:', { lat: metadata.lat, lng: metadata.lng });
                        } else {
                            // Coordenadas proyectadas - convertir a geográficas (simplificado)
                            const { lat, lng } = convertProjectedToGeo(worldX, worldY);
                            metadata.lat = lat;
                            metadata.lng = lng;
                            metadata.projection = 'UTM';
                            console.log('Coordenadas proyectadas convertidas:', { lat, lng });
                        }
                    }
                    break;
                    
                case 34735: // GeoKeyDirectoryTag
                    console.log('GeoTIFF GeoKeys encontrados');
                    metadata.projection = metadata.projection || 'Projected';
                    break;
                    
                case 34736: // GeoDoubleParamsTag
                    console.log('GeoTIFF parámetros double encontrados');
                    break;
                    
                case 34737: // GeoAsciiParamsTag
                    console.log('GeoTIFF parámetros ASCII encontrados');
                    break;
            }
            
            entryOffset += 12; // Cada entrada IFD es de 12 bytes
        }
        
        // Calcular centro y zoom si tenemos bounds
        if (metadata.bounds && !metadata.lat) {
            metadata.lat = (metadata.bounds.north + metadata.bounds.south) / 2;
            metadata.lng = (metadata.bounds.east + metadata.bounds.west) / 2;
            
            // Calcular zoom basándose en el área
            const latDiff = metadata.bounds.north - metadata.bounds.south;
            const lngDiff = metadata.bounds.east - metadata.bounds.west;
            const maxDiff = Math.max(latDiff, lngDiff);
            
            if (maxDiff > 10) metadata.zoom = 6;
            else if (maxDiff > 1) metadata.zoom = 10;
            else if (maxDiff > 0.1) metadata.zoom = 13;
            else metadata.zoom = 16;
            
            console.log('Centro calculado desde bounds:', { lat: metadata.lat, lng: metadata.lng, zoom: metadata.zoom });
        }
        
        // Generar coordenadas de polígono si tenemos bounds
        if (metadata.bounds) {
            metadata.coordinates = [
                [metadata.bounds.north, metadata.bounds.west], // NW
                [metadata.bounds.north, metadata.bounds.east], // NE
                [metadata.bounds.south, metadata.bounds.east], // SE
                [metadata.bounds.south, metadata.bounds.west], // SW
                [metadata.bounds.north, metadata.bounds.west]  // Cerrar polígono
            ];
            console.log('Polígono generado desde bounds');
        }
        
        if (metadata.lat && metadata.lng) {
            console.log('=== METADATOS GEOTIFF EXTRAÍDOS EXITOSAMENTE ===');
            return metadata as GeoMetadata;
        }
        
        return null;
        
    } catch (error) {
        console.error('Error extrayendo metadatos GeoTIFF:', error);
        return null;
    }
};

/**
 * Extrae metadatos de archivos Sentinel-2 (.jp2, .tiff)
 */
export const extractSentinel2Metadata = (arrayBuffer: ArrayBuffer, filename: string): GeoMetadata | null => {
    try {
        console.log('=== EXTRAYENDO METADATOS SENTINEL-2 ===');
        console.log('Filename:', filename);
        
        // Primero intentar GeoTIFF estándar
        const geoMetadata = extractGeoTIFFMetadata(arrayBuffer);
        if (geoMetadata) {
            geoMetadata.source = 'Sentinel-2';
            return geoMetadata;
        }
        
        // Extraer coordenadas del nombre del archivo Sentinel-2
        // Formato típico: T10SFG_20220101T103259_B04_10m.jp2
        const tileMatch = filename.match(/T(\d{2})([A-Z]{3})/);
        if (tileMatch) {
            const zone = parseInt(tileMatch[1]);
            const latBand = tileMatch[2][0];
            const square = tileMatch[2].substring(1);
            
            console.log('Tile Sentinel-2 detectado:', { zone, latBand, square });
            
            // Convertir coordenadas de tile a lat/lng (simplificado)
            const { lat, lng } = convertSentinelTileToGeo(zone, latBand, square);
            
            return {
                lat,
                lng,
                zoom: 12,
                source: 'Sentinel-2',
                projection: 'UTM'
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('Error extrayendo metadatos Sentinel-2:', error);
        return null;
    }
};

/**
 * Extrae metadatos de archivos QGIS (.tif, .tiff con world files)
 */
export const extractQGISMetadata = (arrayBuffer: ArrayBuffer): GeoMetadata | null => {
    try {
        console.log('=== EXTRAYENDO METADATOS QGIS ===');
        
        // Intentar GeoTIFF primero
        const geoMetadata = extractGeoTIFFMetadata(arrayBuffer);
        if (geoMetadata) {
            geoMetadata.source = 'QGIS';
            return geoMetadata;
        }
        
        // Buscar metadatos en formato texto dentro del archivo
        const decoder = new TextDecoder();
        const fullText = decoder.decode(new Uint8Array(arrayBuffer));
        
        // Buscar patrones típicos de QGIS
        const patterns = [
            /GEOGCS\["([^"]+)"/,  // Coordinate system
            /PROJCS\["([^"]+)"/,  // Projected coordinate system
            /EPSG["\s:]*(\d+)/,   // EPSG code
        ];
        
        for (const pattern of patterns) {
            const match = fullText.match(pattern);
            if (match) {
                console.log('Patrón QGIS encontrado:', match[0]);
                // Aquí se podría implementar conversión de coordenadas más específica
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('Error extrayendo metadatos QGIS:', error);
        return null;
    }
};

// Funciones auxiliares

function readString(view: DataView, offset: number, length: number, isLittleEndian: boolean): string {
    try {
        let valueOffset = offset;
        if (length > 4) {
            valueOffset = isLittleEndian ? view.getUint32(offset, true) : view.getUint32(offset, false);
        }
        
        const bytes = new Uint8Array(view.buffer, valueOffset, length);
        const nullIndex = bytes.indexOf(0);
        const actualLength = nullIndex >= 0 ? nullIndex : length;
        
        return new TextDecoder().decode(bytes.slice(0, actualLength));
    } catch (error) {
        console.error('Error reading string:', error);
        return '';
    }
}

function readDoubleArray(view: DataView, offset: number, count: number, isLittleEndian: boolean): number[] {
    try {
        let valueOffset = offset;
        const doubleSize = 8;
        
        if (count * doubleSize > 4) {
            valueOffset = isLittleEndian ? view.getUint32(offset, true) : view.getUint32(offset, false);
        }
        
        const result: number[] = [];
        for (let i = 0; i < count; i++) {
            const value = isLittleEndian ? 
                view.getFloat64(valueOffset + i * doubleSize, true) : 
                view.getFloat64(valueOffset + i * doubleSize, false);
            result.push(value);
        }
        
        return result;
    } catch (error) {
        console.error('Error reading double array:', error);
        return [];
    }
}

function convertProjectedToGeo(x: number, y: number): { lat: number; lng: number } {
    // Conversión simplificada de coordenadas proyectadas a geográficas
    // En un sistema real, se usaría proj4js o similar
    
    // Asumir UTM para coordenadas grandes
    if (Math.abs(x) > 1000000 || Math.abs(y) > 1000000) {
        // Conversión aproximada UTM a WGS84
        const lng = (x / 111320) - 180; // Muy simplificado
        const lat = (y / 110540) - 90;  // Muy simplificado
        
        return {
            lat: Math.max(-90, Math.min(90, lat)),
            lng: Math.max(-180, Math.min(180, lng))
        };
    }
    
    // Si las coordenadas parecen geográficas, devolverlas como están
    return { lat: y, lng: x };
}

function convertSentinelTileToGeo(zone: number, latBand: string, square: string): { lat: number; lng: number } {
    // Conversión simplificada de tiles Sentinel-2 a coordenadas geográficas
    // Basándose en la grilla UTM/MGRS
    
    const latBands: { [key: string]: number } = {
        'C': -80, 'D': -72, 'E': -64, 'F': -56, 'G': -48, 'H': -40,
        'J': -32, 'K': -24, 'L': -16, 'M': -8, 'N': 0, 'P': 8,
        'Q': 16, 'R': 24, 'S': 32, 'T': 40, 'U': 48, 'V': 56,
        'W': 64, 'X': 72
    };
    
    const baseLat = latBands[latBand] || 0;
    const baseLng = (zone - 31) * 6; // Aproximación de zona UTM
    
    return {
        lat: baseLat + 4, // Centro aproximado de la banda
        lng: baseLng + 3  // Centro aproximado de la zona
    };
}
