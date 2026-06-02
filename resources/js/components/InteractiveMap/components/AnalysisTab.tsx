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
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm"></span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Exportar Área</h3>
                        <p className="text-sm text-gray-600">Descarga el área seleccionada en diferentes formatos</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Formato de exportación:</label>
                        <select 
                            value={exportFormat}
                            onChange={(e) => onExportFormatChange(e.target.value as ExportFormat)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            <optgroup label=" Formatos de Imagen">
                                <option value="tiff">TIFF (Recomendado para GIS)</option>
                                <option value="png">PNG (Transparencia)</option>
                                <option value="jpg">JPG (Comprimido)</option>
                            </optgroup>
                            <optgroup label=" Formatos Geográficos">
                                <option value="geojson">GeoJSON (Web mapping)</option>
                                <option value="kml">KML (Google Earth)</option>
                                <option value="csv">CSV (Coordenadas)</option>
                            </optgroup>
                        </select>
                    </div>
                    
                    <button 
                        className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-all ${
                            isExporting || selectedAreas.length === 0
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-gray-600 hover:bg-gray-700 shadow-lg hover:shadow-xl'
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
                                    <> Exportar Coordenadas ({exportFormat.toUpperCase()})</>
                                ) : (
                                    <> Descargar Área ({exportFormat.toUpperCase()})</>
                                )}
                            </>
                        )}
                    </button>
                    
                    {selectedAreas.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5"></span>
                                <div className="text-sm">
                                    <p className="text-green-800 font-medium">
                                        Área lista para exportar
                                    </p>
                                    <p className="text-green-600 mt-1">
                                        {selectedAreas.length} región{selectedAreas.length > 1 ? 'es' : ''} seleccionada{selectedAreas.length > 1 ? 's' : ''}
                                        {selectedAreas[selectedAreas.length - 1].area && (
                                            <span className="block text-gray-600">
                                                Tamaño: {formatArea(selectedAreas[selectedAreas.length - 1].area!)}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {selectedAreas.length === 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-amber-800">
                                <span></span>
                                <p className="text-sm">
                                    Dibuja un área en el mapa para habilitar la exportación
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm"></span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Guardar Proyecto</h3>
                        <p className="text-sm text-gray-600">Guarda tu trabajo para continuar más tarde</p>
                    </div>
                </div>
                
                <button 
                    className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    onClick={onSaveImage}
                >
                    <span></span>
                    <span>Guardar en Workspace</span>
                </button>
                
                <div className="mt-3 p-3 bg-green-100 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                        <span></span>
                        <span>Guarda áreas seleccionadas, configuraciones y resultados de búsqueda en tu workspace personal.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
