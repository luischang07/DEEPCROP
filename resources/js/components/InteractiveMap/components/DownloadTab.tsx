import React from 'react';

interface DownloadTabProps {
    sentinelChecked: boolean;
    planetChecked: boolean;
    startDate: string;
    endDate: string;
    selectedName: string;
    isSearching: boolean;
    onSentinelChange: (checked: boolean) => void;
    onPlanetChange: (checked: boolean) => void;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onSearch: () => void;
}

export const DownloadTab: React.FC<DownloadTabProps> = ({
    sentinelChecked,
    planetChecked,
    startDate,
    endDate,
    selectedName,
    isSearching,
    onSentinelChange,
    onPlanetChange,
    onStartDateChange,
    onEndDateChange,
    onFileChange,
    onSearch
}) => {
    return (
        <div className="space-y-4">
            {/* Checkbox group */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">SELECCIONA LOS SATELITES:</h3>
                <label className="flex items-center">
                    <input 
                        type="checkbox" 
                        checked={sentinelChecked}
                        onChange={(e) => onSentinelChange(e.target.checked)}
                        className="mr-2" 
                    />
                    <span className="text-sm text-gray-700">Sentinel</span>
                </label>
                <label className="flex items-center">
                    <input 
                        type="checkbox" 
                        checked={planetChecked}
                        onChange={(e) => onPlanetChange(e.target.checked)}
                        className="mr-2" 
                    />
                    <span className="text-sm text-gray-700">Planet Scope</span>
                </label>
            </div>

            {/* Time range */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-800">RANGO TEMPORAL:</h4>
                
                <div className="space-y-2">
                    <label className="block text-sm text-gray-600">Desde:</label>
                    <div className="flex space-x-2">
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => onStartDateChange(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input 
                            type="time" 
                            defaultValue="12:00"
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="block text-sm text-gray-600">Hasta:</label>
                    <div className="flex space-x-2">
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => onEndDateChange(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input 
                            type="time" 
                            defaultValue="12:00"
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Search button */}
            <button 
                className={`w-full py-3 px-4 rounded font-medium ${
                    isSearching 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
                onClick={onSearch}
                disabled={isSearching}
            >
                {isSearching ? 'Buscando...' : 'Buscar'}
            </button>

            {/* File upload */}

            <h3 className='text-center'>Carga una area desde un archivo</h3>
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    selectedName ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onClick={() => document.getElementById('file-upload-input')?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                        const event = {
                            target: { files },
                        } as unknown as React.ChangeEvent<HTMLInputElement>;
                        onFileChange(event);
                    }
                }}
            >
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {selectedName || 'Sube o arrastra una imagen aquí'}
                </h3>
                <div className="flex justify-center items-center mb-2">
                    <span className="text-4xl">📁</span>
                </div>
                <input
                    id="file-upload-input"
                    type="file"
                    onChange={onFileChange}
                    accept="image/*,.tiff,.tif"
                    className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2">Formatos soportados: JPG, PNG, TIFF</p>
            </div>
        </div>
    );
};
