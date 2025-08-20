// Función para extraer coordenadas EXIF de una imagen
import { extractGeoTIFFMetadata, extractSentinel2Metadata, extractQGISMetadata, type GeoMetadata } from './geoMetadata';

export const extractImageCoordinates = (file: File): Promise<{ lat: number; lng: number; zoom?: number; coordinates?: number[][] } | null> => {
    return new Promise((resolve) => {
        console.log('=== EXTRACCIÓN DE METADATOS INICIADA ===');
        console.log('Archivo:', {
            name: file.name,
            size: file.size,
            type: file.type,
            extension: file.name.split('.').pop()?.toLowerCase()
        });
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                if (!arrayBuffer) {
                    console.log('No se pudo leer el ArrayBuffer');
                    resolve(null);
                    return;
                }

                console.log('Archivo cargado en memoria:', {
                    size: arrayBuffer.byteLength,
                    sizeMB: (arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)
                });
                
                // 1. Intentar extraer metadatos DEEPCROP (formato propio)
                const deepcropMetadata = extractDEEPCROPMetadata(arrayBuffer);
                if (deepcropMetadata) {
                    console.log('=== METADATOS DEEPCROP ENCONTRADOS ===');
                    console.log('Metadata completa:', deepcropMetadata);
                    resolve(deepcropMetadata);
                    return;
                }

                console.log('=== NO SE ENCONTRARON METADATOS DEEPCROP ===');
                
                // 2. Intentar extraer metadatos geoespaciales estándar
                console.log('Intentando extracción de metadatos geoespaciales estándar...');
                
                const extension = file.name.split('.').pop()?.toLowerCase();
                let geoMetadata: GeoMetadata | null = null;
                
                // Detectar tipo de archivo geoespacial
                if (extension === 'tif' || extension === 'tiff') {
                    console.log('Archivo TIFF detectado - verificando tipo...');
                    
                    // Verificar si es Sentinel-2 por el nombre
                    if (file.name.includes('sentinel') || file.name.includes('S2') || /T\d{2}[A-Z]{3}/.test(file.name)) {
                        console.log('Archivo Sentinel-2 detectado');
                        geoMetadata = extractSentinel2Metadata(arrayBuffer, file.name);
                    } else {
                        console.log('Intentando GeoTIFF estándar (QGIS compatible)');
                        geoMetadata = extractGeoTIFFMetadata(arrayBuffer);
                        if (!geoMetadata) {
                            geoMetadata = extractQGISMetadata(arrayBuffer);
                        }
                    }
                } else if (extension === 'jp2') {
                    console.log('Archivo JP2 (posible Sentinel-2) detectado');
                    geoMetadata = extractSentinel2Metadata(arrayBuffer, file.name);
                }
                
                if (geoMetadata) {
                    console.log('=== METADATOS GEOESPACIALES ENCONTRADOS ===');
                    console.log('Fuente:', geoMetadata.source);
                    console.log('Proyección:', geoMetadata.projection);
                    console.log('Coordenadas:', { lat: geoMetadata.lat, lng: geoMetadata.lng });
                    console.log('Bounds:', geoMetadata.bounds);
                    console.log('Metadata completa:', geoMetadata);
                    resolve(geoMetadata);
                    return;
                }
                
                // 3. Fallback: intentar EXIF estándar
                console.log('Intentando extracción EXIF estándar...');
                const exifData = extractStandardEXIF(arrayBuffer);
                if (exifData) {
                    console.log('EXIF estándar encontrado:', exifData);
                    resolve(exifData);
                    return;
                }
                
                console.log('No se encontraron metadatos de ubicación en el archivo');
                resolve(null);
            } catch (error) {
                console.error('=== ERROR EN EXTRACCIÓN DE METADATOS ===');
                console.error('Error details:', error);
                resolve(null);
            }
        };
        
        reader.onerror = (error) => {
            console.error('Error leyendo archivo:', error);
            resolve(null);
        };
        
        reader.readAsArrayBuffer(file);
    });
};

// Función para extraer metadatos de DEEPCROP de archivos PNG/JPEG/TIFF
export const extractDEEPCROPMetadata = (arrayBuffer: ArrayBuffer): { lat: number; lng: number; zoom?: number; coordinates?: number[][] } | null => {
    try {
        const view = new DataView(arrayBuffer);
        const decoder = new TextDecoder();
        
        console.log('=== ANALIZANDO ARCHIVO ===');
        console.log('Tamaño del archivo:', arrayBuffer.byteLength, 'bytes');
        console.log('Primeros 16 bytes:', Array.from(new Uint8Array(arrayBuffer, 0, Math.min(16, arrayBuffer.byteLength))).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        
        // Verificar si es PNG
        if (arrayBuffer.byteLength >= 8 && view.getUint32(0) === 0x89504E47 && view.getUint32(4) === 0x0D0A1A0A) {
            console.log('=== ARCHIVO PNG DETECTADO ===');
            return extractPNGMetadata(view, decoder);
        }
        
        // Verificar si es JPEG
        if (arrayBuffer.byteLength >= 2 && view.getUint16(0) === 0xFFD8) {
            console.log('=== ARCHIVO JPEG DETECTADO ===');
            return extractJPEGMetadata(view, decoder);
        }
        
        // Verificar si es TIFF (little endian II*\0 o big endian MM\0*)
        if (arrayBuffer.byteLength >= 4) {
            const first4Bytes = view.getUint32(0);
            if (first4Bytes === 0x49492A00) {
                console.log('=== ARCHIVO TIFF LITTLE ENDIAN DETECTADO ===');
                return extractTIFFMetadata(view, decoder);
            } else if (first4Bytes === 0x4D4D002A) {
                console.log('=== ARCHIVO TIFF BIG ENDIAN DETECTADO ===');
                return extractTIFFMetadata(view, decoder);
            }
        }
        
        // Verificar archivos TIFF híbridos o con header personalizado
        if (arrayBuffer.byteLength >= 8) {
            const first8Bytes = Array.from(new Uint8Array(arrayBuffer, 0, 8));
            console.log('Primeros 8 bytes como array:', first8Bytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
            
            if ((first8Bytes[0] === 0x49 && first8Bytes[1] === 0x49) || 
                (first8Bytes[0] === 0x4D && first8Bytes[1] === 0x4D)) {
                console.log('=== ARCHIVO TIFF HÍBRIDO/PERSONALIZADO DETECTADO ===');
                return extractTIFFMetadata(view, decoder);
            }
        }
        
        // Buscar patrón DEEPCROP en cualquier parte del archivo
        console.log('=== BÚSQUEDA DE PATRONES DEEPCROP EN ARCHIVO ===');
        const fullText = decoder.decode(new Uint8Array(arrayBuffer));
        
        // Buscar diferentes patrones de metadatos DEEPCROP
        const patterns = [
            /DEEPCROP_META[:\s]*({[^}]+})/gi,
            /DEEPCROP_TIFF_META[:\s]*({[^}]+})/gi,
            /"DEEPCROP[^"]*"[:\s]*({[^}]+})/gi,
            /{"lat":\s*[-+]?\d*\.?\d+[^}]+}/gi
        ];
        
        for (const pattern of patterns) {
            const matches = fullText.match(pattern);
            if (matches) {
                console.log('Patrón encontrado:', pattern.source);
                console.log('Matches:', matches);
                
                for (const match of matches) {
                    try {
                        // Extraer JSON del match
                        const jsonMatch = match.match(/{[^}]+}/);
                        if (jsonMatch) {
                            const jsonStr = jsonMatch[0];
                            console.log('Intentando parsear JSON:', jsonStr);
                            const metadata = JSON.parse(jsonStr);
                            
                            // Validar que tenga las propiedades esperadas
                            if (metadata && (metadata.lat || metadata.coordinates)) {
                                console.log('=== METADATOS DEEPCROP ENCONTRADOS VÍA PATRÓN ===');
                                console.log('Metadata encontrada:', metadata);
                                return metadata;
                            }
                        }
                    } catch (e) {
                        console.log('Error parseando match:', match, e);
                    }
                }
            }
        }
        
        console.log('=== FORMATO DE ARCHIVO NO RECONOCIDO ===');
        console.log('El archivo no coincide con ningún formato conocido');
        return null;
    } catch (error) {
        console.error('=== ERROR EXTRAYENDO METADATOS DEEPCROP ===');
        console.error('Error details:', error);
        return null;
    }
};

const extractPNGMetadata = (view: DataView, decoder: TextDecoder): { lat: number; lng: number; zoom?: number; coordinates?: number[][] } | null => {
    let offset = 8; // Saltar PNG signature
    
    while (offset < view.byteLength - 8) {
        const chunkLength = view.getUint32(offset);
        const chunkType = decoder.decode(new Uint8Array(view.buffer, offset + 4, 4));
        
        if (chunkType === 'tEXt') {
            const chunkData = new Uint8Array(view.buffer, offset + 8, chunkLength);
            const text = decoder.decode(chunkData);
            
            if (text.startsWith('DEEPCROP_META\0')) {
                const metadataJson = text.substring(14); // Remover "DEEPCROP_META\0"
                try {
                    const metadata = JSON.parse(metadataJson);
                    console.log('Found PNG metadata:', metadata);
                    return metadata;
                } catch (e) {
                    console.error('Error parsing PNG metadata JSON:', e);
                }
            }
        }
        
        offset += 8 + chunkLength + 4; // Saltar al siguiente chunk
    }
    
    return null;
};

const extractJPEGMetadata = (view: DataView, decoder: TextDecoder): { lat: number; lng: number; zoom?: number; coordinates?: number[][] } | null => {
    let offset = 2; // Saltar SOI marker
    
    while (offset < view.byteLength - 2) {
        if (view.getUint8(offset) !== 0xFF) break;
        
        const marker = view.getUint8(offset + 1);
        
        if (marker === 0xFE) { // Comment marker
            const commentLength = view.getUint16(offset + 2) - 2;
            const comment = decoder.decode(new Uint8Array(view.buffer, offset + 4, commentLength));
            
            if (comment.startsWith('DEEPCROP_META:')) {
                const metadataJson = comment.substring(14);
                try {
                    const metadata = JSON.parse(metadataJson);
                    console.log('Found JPEG metadata:', metadata);
                    return metadata;
                } catch (e) {
                    console.error('Error parsing JPEG metadata JSON:', e);
                }
            }
        }
        
        const segmentLength = view.getUint16(offset + 2);
        offset += 2 + segmentLength;
    }
    
    return null;
};

const extractTIFFMetadata = (view: DataView, decoder: TextDecoder): { lat: number; lng: number; zoom?: number; coordinates?: number[][] } | null => {
    try {
        // Verificar el header TIFF
        const byteOrder = view.getUint16(0);
        const isLittleEndian = byteOrder === 0x4949; // "II" para little endian
        const isBigEndian = byteOrder === 0x4D4D;    // "MM" para big endian
        
        if (!isLittleEndian && !isBigEndian) {
            console.log('Not a valid TIFF file');
            return null;
        }
        
        console.log('TIFF detected, byte order:', isLittleEndian ? 'Little Endian' : 'Big Endian');
        
        // Buscar metadatos en el contenido completo del archivo
        const fullData = decoder.decode(new Uint8Array(view.buffer));
        console.log('Data after TIFF header:', fullData.substring(8, Math.min(200, fullData.length)));
        
        // Verificar si es nuestro formato híbrido (metadatos después del header TIFF)
        const headerLength = 4; // Header TIFF básico
        if (view.byteLength > headerLength + 10) {
            
            // Buscar el patrón DEEPCROP_TIFF_META: seguido de JSON
            const deepcropIndex = fullData.indexOf('DEEPCROP_TIFF_META:');
            if (deepcropIndex !== -1) {
                console.log('Found DEEPCROP_TIFF_META pattern at index:', deepcropIndex);
                
                // Extraer todo después del marcador hasta encontrar el final del JSON
                let jsonStart = deepcropIndex + 'DEEPCROP_TIFF_META:'.length;
                let jsonStr = fullData.substring(jsonStart);
                
                console.log('Raw JSON string start:', jsonStr.substring(0, 100));
                
                // Encontrar el final del JSON buscando llaves balanceadas
                let braceCount = 0;
                let jsonEnd = -1;
                let inString = false;
                let escaped = false;
                let foundFirstBrace = false;
                
                for (let i = 0; i < jsonStr.length; i++) {
                    const char = jsonStr[i];
                    
                    if (escaped) {
                        escaped = false;
                        continue;
                    }
                    
                    if (char === '\\') {
                        escaped = true;
                        continue;
                    }
                    
                    if (char === '"') {
                        inString = !inString;
                        continue;
                    }
                    
                    if (!inString) {
                        if (char === '{') {
                            braceCount++;
                            foundFirstBrace = true;
                        } else if (char === '}') {
                            braceCount--;
                            if (braceCount === 0 && foundFirstBrace) {
                                jsonEnd = i + 1;
                                break;
                            }
                        }
                    }
                }
                
                if (jsonEnd !== -1) {
                    jsonStr = jsonStr.substring(0, jsonEnd);
                    console.log('Extracted complete JSON:', jsonStr);
                    
                    try {
                        const metadata = JSON.parse(jsonStr);
                        console.log('=== METADATOS TIFF PARSEADOS EXITOSAMENTE ===');
                        console.log('Metadata:', metadata);
                        return metadata;
                    } catch (parseError) {
                        console.error('Error parsing extracted JSON:', parseError);
                        console.log('Failed JSON string:', jsonStr);
                    }
                } else {
                    console.log('Could not find complete JSON - no closing brace found');
                }
            }
            
            // Fallback: buscar JSON directamente después del header
            const afterHeader = decoder.decode(new Uint8Array(view.buffer, headerLength, Math.min(200, view.byteLength - headerLength)));
            if (afterHeader.trim().startsWith('{"')) {
                try {
                    let jsonStr = afterHeader.trim();
                    
                    // Limpiar el JSON de caracteres no válidos
                    const endIdx = jsonStr.indexOf('\0');
                    if (endIdx !== -1) {
                        jsonStr = jsonStr.substring(0, endIdx);
                    }
                    
                    const metadata = JSON.parse(jsonStr);
                    console.log('Found TIFF hybrid metadata via fallback:', metadata);
                    return metadata;
                } catch (e) {
                    console.error('Error parsing TIFF hybrid metadata fallback:', e);
                }
            }
        }
        
        // Buscar diferentes patrones de metadatos en todo el archivo
        const patterns = [
            /DEEPCROP_META[:\0]([^"]*)/,
            /DEEPCROP_TIFF_META:([^"\n]*)/,
            /ImageDescription[^\{]*(\{[^}]*\})/,
            /"coordinates":\[\[([^\]]+)\]\]/,
            /\{"coordinates":\[\[.*?\]\].*?\}/s
        ];
        
        for (const pattern of patterns) {
            const match = fullData.match(pattern);
            if (match) {
                try {
                    let metadataStr = match[1] || match[0];
                    if (metadataStr.startsWith('DEEPCROP_TIFF_META:')) {
                        metadataStr = metadataStr.substring('DEEPCROP_TIFF_META:'.length);
                    }
                    
                    // Limpiar caracteres de control
                    metadataStr = metadataStr.replace(/[\x00-\x1F\x7F]/g, '');
                    
                    const metadata = JSON.parse(metadataStr);
                    console.log('Found TIFF pattern metadata:', metadata);
                    return metadata;
                } catch (e) {
                    console.error('Error parsing TIFF pattern metadata:', e, 'String:', match[0]);
                }
            }
        }
        
        // Intentar leer EXIF tags básicos solo si no es formato híbrido
        try {
            const ifdOffset = isLittleEndian ? view.getUint32(4, true) : view.getUint32(4, false);
            console.log('IFD Offset:', ifdOffset);
            
            // Validar que el IFD offset sea razonable
            if (ifdOffset < view.byteLength && ifdOffset > 8 && ifdOffset < view.byteLength - 100) {
                console.log('Attempting to read standard TIFF EXIF data at offset:', ifdOffset);
                // Aquí podríamos implementar lectura de EXIF estándar si es necesario
            } else {
                console.log('Invalid IFD offset, skipping EXIF reading');
            }
        } catch (e) {
            console.error('Error reading TIFF EXIF data:', e);
        }
        
    } catch (error) {
        console.error('Error in extractTIFFMetadata:', error);
    }
    
    return null;
};

// Función para extraer EXIF estándar como fallback
const extractStandardEXIF = (arrayBuffer: ArrayBuffer): { lat: number; lng: number; zoom?: number } | null => {
    try {
        const view = new DataView(arrayBuffer);
        
        // Verificar si es JPEG con EXIF
        if (view.getUint16(0) === 0xFFD8) {
            console.log('Intentando extraer EXIF de JPEG...');
            // Buscar marker EXIF (0xFFE1)
            let offset = 2;
            while (offset < view.byteLength - 4) {
                const marker = view.getUint16(offset);
                if (marker === 0xFFE1) {
                    const segmentLength = view.getUint16(offset + 2);
                    const exifHeader = new Uint8Array(arrayBuffer, offset + 4, Math.min(6, segmentLength));
                    const exifString = String.fromCharCode(...exifHeader);
                    
                    if (exifString.startsWith('Exif\0\0')) {
                        console.log('EXIF segment found, but detailed parsing not implemented');
                        // Aquí se implementaría el parsing completo de EXIF
                        // Por ahora solo devolvemos null
                    }
                    break;
                }
                offset += 2;
                if (offset + 2 < view.byteLength) {
                    offset += view.getUint16(offset);
                } else {
                    break;
                }
            }
        }
        
        console.log('No se encontraron coordenadas GPS en EXIF estándar');
        return null;
    } catch (error) {
        console.error('Error extracting standard EXIF:', error);
        return null;
    }
};
