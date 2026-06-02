
// Función para calcular el área de un polígono en metros cuadrados
export const calculateArea = (coordinates: number[][]): number => {
    if (coordinates.length < 3) return 0;
    
    // Usar la fórmula de Shoelace para calcular el área
    let area = 0;
    const n = coordinates.length - 1; // Excluir el último punto si es igual al primero
    
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += coordinates[i][0] * coordinates[j][1];
        area -= coordinates[j][0] * coordinates[i][1];
    }
    
    area = Math.abs(area) / 2;
    
    // Convertir de grados cuadrados a metros cuadrados (aproximación)
    // 1 grado ≈ 111,320 metros en el ecuador
    const metersPerDegree = 111320;
    return area * metersPerDegree * metersPerDegree;
};

export const getBoundsFromCoordinates = (coordinates: number[][]) => {
    if (coordinates.length === 0) return null;
    
    let minLat = coordinates[0][0], maxLat = coordinates[0][0];
    let minLng = coordinates[0][1], maxLng = coordinates[0][1];
    
    coordinates.forEach(coord => {
        minLat = Math.min(minLat, coord[0]);
        maxLat = Math.max(maxLat, coord[0]);
        minLng = Math.min(minLng, coord[1]);
        maxLng = Math.max(maxLng, coord[1]);
    });
    
    return {
        north: maxLat,
        south: minLat,
        east: maxLng,
        west: minLng
    };
};

export const formatArea = (area: number): string => {
    if (area > 1000000) {
        return `${(area / 1000000).toFixed(2)} km²`;
    } else {
        return `${area.toFixed(2)} m²`;
    }
};
