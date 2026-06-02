/**
 * Utilidad para crear archivos TIFF de prueba con metadatos DEEPCROP
 * Esta función es solo para testing y desarrollo
 */

export const createTestTIFFWithMetadata = (coordinates: number[][], centerLat: number, centerLng: number): Blob => {
    // Metadatos DEEPCROP a incluir
    const metadata = {
        lat: centerLat,
        lng: centerLng,
        zoom: 15,
        coordinates: coordinates,
        format: 'DEEPCROP_TIFF',
        created: new Date().toISOString()
    };
    
    const metadataString = JSON.stringify(metadata);
    console.log('Creating test TIFF with metadata:', metadataString);
    console.log('Metadata string length:', metadataString.length);
    
    // Crear un TIFF mínimo con metadatos embebidos
    const tiffHeader = new Uint8Array([
        // TIFF header (little endian)
        0x49, 0x49, // "II" little endian
        0x2A, 0x00, // TIFF magic number
        0x08, 0x00, 0x00, 0x00, // IFD offset
    ]);
    
    // Convertir metadatos a bytes
    const prefixBytes = new TextEncoder().encode('DEEPCROP_TIFF_META:');
    const metadataBytes = new TextEncoder().encode(metadataString);
    const fullMetadataBytes = new Uint8Array(prefixBytes.length + metadataBytes.length);
    fullMetadataBytes.set(prefixBytes, 0);
    fullMetadataBytes.set(metadataBytes, prefixBytes.length);
    
    // Calcular offsets
    const ifdOffset = 8;
    const ifdSize = 2 + (3 * 12) + 4; // 2 bytes para count + 3 entries * 12 bytes + 4 bytes para next IFD
    const dataOffset = ifdOffset + ifdSize;
    
    // Crear el archivo TIFF con tamaño exacto
    const totalSize = dataOffset + fullMetadataBytes.length + 100; // Un poco de padding
    const tiffData = new Uint8Array(totalSize);
    
    // Copiar header
    tiffData.set(tiffHeader, 0);
    
    // IFD básico (Image File Directory)
    const view = new DataView(tiffData.buffer);
    
    // Número de entradas IFD
    view.setUint16(ifdOffset, 3, true); // 3 entries, little endian
    
    let entryOffset = ifdOffset + 2;
    
    // Entry 1: ImageWidth (tag 256)
    view.setUint16(entryOffset, 256, true); // tag
    view.setUint16(entryOffset + 2, 4, true); // type (LONG)
    view.setUint32(entryOffset + 4, 1, true); // count
    view.setUint32(entryOffset + 8, 100, true); // value (100px width)
    entryOffset += 12;
    
    // Entry 2: ImageLength (tag 257)
    view.setUint16(entryOffset, 257, true); // tag
    view.setUint16(entryOffset + 2, 4, true); // type (LONG)
    view.setUint32(entryOffset + 4, 1, true); // count
    view.setUint32(entryOffset + 8, 100, true); // value (100px height)
    entryOffset += 12;
    
    // Entry 3: Custom metadata (tag 50000)
    view.setUint16(entryOffset, 50000, true); // custom tag
    view.setUint16(entryOffset + 2, 2, true); // type (ASCII)
    view.setUint32(entryOffset + 4, fullMetadataBytes.length, true); // count
    view.setUint32(entryOffset + 8, dataOffset, true); // offset to metadata
    entryOffset += 12;
    
    // Next IFD pointer (0 = no more IFDs)
    view.setUint32(entryOffset, 0, true);
    
    // Copiar metadatos completos al offset calculado
    tiffData.set(fullMetadataBytes, dataOffset);
    
    console.log('TIFF created with total size:', totalSize);
    console.log('Metadata placed at offset:', dataOffset);
    console.log('Full metadata size:', fullMetadataBytes.length);
    
    return new Blob([tiffData], { type: 'image/tiff' });
};

export const downloadTestTIFF = (coordinates: number[][], centerLat: number, centerLng: number, filename: string = 'test_deepcrop.tiff') => {
    const blob = createTestTIFFWithMetadata(coordinates, centerLat, centerLng);
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log(`Test TIFF file "${filename}" created and downloaded`);
};
