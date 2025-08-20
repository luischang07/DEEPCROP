import React from 'react';
import { ExportFormat, SelectedArea } from '../types';
import { formatArea } from '../utils';

interface AnalysisTabProps {
    selectedAreas: SelectedArea[];
    exportFormat: ExportFormat;
    isExporting: boolean;
    onExportFormatChange: (format: ExportFormat) => void;
    onExportArea: () => void;
    onSaveImage: () => void;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
    selectedAreas,
    exportFormat,
    isExporting,
    onExportFormatChange,
    onExportArea,
    onSaveImage
}) => {
    return (
        <div className="space-y-4">
            {/* Analysis buttons */}
            <div className="space-y-2">
                <hr className="my-4" />
                {/* Export area section */}
                <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-800">Exportar Área Seleccionada:</h4>
                    
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Formato de exportación:</label>
                        <select 
                            value={exportFormat}
                            onChange={(e) => onExportFormatChange(e.target.value as ExportFormat)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                            <optgroup label="Formatos de Imagen">
                                <option value="tiff">TIFF (Recomendado)</option>
                                <option value="png">PNG</option>
                                <option value="jpg">JPG</option>
                            </optgroup>
                            <optgroup label="Formatos de Datos Geográficos">
                                <option value="geojson">GeoJSON</option>
                                <option value="kml">KML (Google Earth)</option>
                                <option value="csv">CSV (Coordenadas)</option>
                            </optgroup>
                        </select>
                    </div>
                    
                    <button 
                        className={`w-full py-2 px-4 rounded font-medium flex items-center justify-center ${
                            isExporting || selectedAreas.length === 0
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-blue-500 hover:bg-blue-600'
                        } text-white`}
                        onClick={onExportArea}
                        disabled={isExporting || selectedAreas.length === 0}
                    >
                        {isExporting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Exportando...
                            </>
                        ) : (
                            <>
                                {['geojson', 'csv', 'kml'].includes(exportFormat) ? (
                                    <>📄 Exportar Coordenadas ({exportFormat.toUpperCase()})</>
                                ) : (
                                    <>⬇️ Descargar Área ({exportFormat.toUpperCase()})</>
                                )}
                            </>
                        )}
                    </button>
                    
                    {selectedAreas.length > 0 && (
                        <div className="text-xs text-green-600 bg-green-50 p-2 rounded border">
                            ✅ Área seleccionada: {selectedAreas.length} región{selectedAreas.length > 1 ? 'es' : ''}
                            <br />
                            {selectedAreas[selectedAreas.length - 1].area && (
                                <span className="text-gray-600">
                                    Tamaño: {formatArea(selectedAreas[selectedAreas.length - 1].area!)}
                                </span>
                            )}
                        </div>
                    )}
                    
                    {selectedAreas.length === 0 && (
                        <p className="text-xs text-gray-500 text-center">
                            Dibuja un área en el mapa para habilitarlo
                        </p>
                    )}
                </div>
                
                <button 
                    className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium"
                    onClick={onSaveImage}
                >
                    💾 Guardar en...
                </button>
                <hr className="my-4" />
            </div>
        </div>
    );
};
