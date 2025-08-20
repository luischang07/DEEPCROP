import React from 'react';
import { SelectedArea } from '../types';
import { formatArea } from '../utils';

interface AreaInfoPanelProps {
    selectedAreas: SelectedArea[];
}

export const AreaInfoPanel: React.FC<AreaInfoPanelProps> = ({ selectedAreas }) => {
    if (selectedAreas.length === 0) return null;

    return (
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg max-w-sm max-h-64 overflow-y-auto z-[1000]">
            <h3 className="font-semibold text-lg mb-2">Áreas Seleccionadas</h3>
            {selectedAreas.map((area, index) => (
                <div key={index} className="mb-3 p-2 border rounded">
                    <p className="font-medium">{area.type}</p>
                    <p className="text-sm text-gray-600">
                        Coordenadas: {area.coordinates.length} puntos
                    </p>
                    {area.area && (
                        <p className="text-sm text-gray-600">
                            Área: {formatArea(area.area)}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
};
