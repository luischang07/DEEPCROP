import React, { useState } from 'react';
import { workspaceApi } from '@/services/workspaceApi';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItemButton,
    ListItemText,
    CircularProgress,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';

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
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [workspaceFiles, setWorkspaceFiles] = useState<any[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [workspaceLoading, setWorkspaceLoading] = useState(false);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [loadingToMap, setLoadingToMap] = useState(false);

    const openLoadDialog = async () => {
        setShowLoadDialog(true);
        setWorkspaceLoading(true);
        setFilesLoading(true);
        try {
            const w = await workspaceApi.getWorkspaces();
            setWorkspaces(w || []);

            const defaultId = w && w.length > 0 ? w[0].id : null;
            const workspaceIdToLoad = selectedWorkspaceId || defaultId;
            setSelectedWorkspaceId(workspaceIdToLoad);

            if (workspaceIdToLoad) {
                const filesResp = await workspaceApi.getFiles(workspaceIdToLoad);
                const filesArr = Array.isArray(filesResp) ? filesResp : (filesResp && (filesResp.files || filesResp.data || filesResp) );
                setWorkspaceFiles(filesArr || []);
            } else {
                setWorkspaceFiles([]);
            }
        } catch (err) {
            console.error('Error fetching workspaces or files', err);
            setWorkspaces([]);
            setWorkspaceFiles([]);
        } finally {
            setWorkspaceLoading(false);
            setFilesLoading(false);
        }
    };

    const handleLoadConfirm = async () => {
        if (!selectedFileId) return;
        const { toast } = await import('sonner');
        const toastId = toast.loading('Cargando coordenadas en el mapa...');
        setLoadingToMap(true);
        try {
            if (!selectedWorkspaceId) throw new Error('Por favor selecciona un workspace');
            const file = await workspaceApi.getFile(selectedWorkspaceId, selectedFileId);

            let coordinateData: any = null;

            // 1) If backend returned an array directly
            if (Array.isArray(file.coordinates) && file.coordinates.length > 2) {
                coordinateData = { type: 'polygon', coordinates: file.coordinates };
            }

            // 2) If backend returned object with bounds or center
            if (!coordinateData && file.coordinates && typeof file.coordinates === 'object') {
                if (Array.isArray(file.coordinates.bounds) && file.coordinates.bounds.length > 2) {
                    const coords = file.coordinates.bounds.map((c: any) => Array.isArray(c) ? [c[0], c[1]] : [c.lat, c.lng]);
                    coordinateData = { type: 'polygon', coordinates: coords, center: file.coordinates.center || null };
                } else if (file.coordinates.center) {
                    coordinateData = { type: 'marker', center: file.coordinates.center };
                }
            }

            // 3) fallback to metadata selectedAreas or saved frontend_data
            if (!coordinateData && file.metadata) {
                const sel = file.metadata.selectedAreas || file.metadata.frontend_data?.selectedAreas || null;
                if (sel && Array.isArray(sel) && sel.length > 0) {
                    const sa = sel[0];
                    if (sa.coordinates && sa.coordinates.length > 2) {
                        coordinateData = { type: 'polygon', coordinates: sa.coordinates };
                    } else if (sa.coordinates && sa.coordinates.length === 1 && sa.coordinates[0].length === 2) {
                        // single center point
                        coordinateData = { type: 'marker', center: { lat: sa.coordinates[0][0], lng: sa.coordinates[0][1] } };
                    }
                }
            }

            if (!coordinateData) {
                throw new Error('No se encontraron coordenadas en el archivo seleccionado');
            }

            const event = new CustomEvent('deepcrop:load-coordinates', { detail: { fileId: file.id, fileName: file.name || file.original_name, coordinateData } });
            window.dispatchEvent(event);
            toast.success('Coordenadas cargadas en el mapa', { id: toastId });
            setShowLoadDialog(false);
            setSelectedFileId(null);
        } catch (err) {
            console.error('Error loading coordinates from file', err);
            toast.error(err instanceof Error ? err.message : 'Error cargando coordenadas', { id: toastId });
        } finally {
            setLoadingToMap(false);
        }
    };
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
            <div className="text-center mb-2">
                <button
                    type="button"
                    onClick={openLoadDialog}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50"
                >
                    Cargar coordenadas desde workspace
                </button>
            </div>
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    selectedName ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onClick={() => { if (!showLoadDialog) document.getElementById('file-upload-input')?.click(); }}
                onDragOver={(e) => { if (!showLoadDialog) e.preventDefault(); }}
                onDrop={(e) => {
                    if (showLoadDialog) return;
                    e.preventDefault();
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                        const event = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
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

                {/* Dialog para seleccionar archivo del workspace */}
                <Dialog open={showLoadDialog} onClose={() => setShowLoadDialog(false)} fullWidth maxWidth="sm">
                    <DialogTitle>Seleccionar archivo del workspace</DialogTitle>
                    <DialogContent>
                        {workspaceLoading ? (
                            <div className="p-4 flex justify-center"><CircularProgress /></div>
                        ) : (
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel id="workspace-select-label">Workspace</InputLabel>
                                <Select
                                    labelId="workspace-select-label"
                                    value={selectedWorkspaceId || ''}
                                    label="Workspace"
                                onChange={async (e) => {
                                    const id = e.target.value as string;
                                    setSelectedWorkspaceId(id);
                                    setFilesLoading(true);
                                    try {
                                        const filesResp = await workspaceApi.getFiles(id);
                                        const filesArr = Array.isArray(filesResp) ? filesResp : (filesResp && (filesResp.files || filesResp.data || filesResp));
                                        setWorkspaceFiles(filesArr || []);
                                    } catch (err) {
                                        console.error('Error loading files for workspace', err);
                                        setWorkspaceFiles([]);
                                    } finally {
                                        setFilesLoading(false);
                                    }
                                }}
                                >
                                    {workspaces.map((w) => (
                                        <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {filesLoading ? (
                            <div className="p-4 flex justify-center"><CircularProgress /></div>
                        ) : (
                            <>
                                {workspaceFiles.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                        No se encontraron archivos en este espacio de trabajo.
                                    </Typography>
                                )}
                                <List>
                                    {workspaceFiles.map((f) => (
                                        <ListItemButton key={f.id} selected={selectedFileId === f.id} onClick={() => setSelectedFileId(f.id)}>
                                            <ListItemText primary={f.name || f.original_name} secondary={f.file_size_formatted} />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowLoadDialog(false)} disabled={loadingToMap}>Cancelar</Button>
                        <Button variant="contained" onClick={handleLoadConfirm} disabled={!selectedFileId || loadingToMap}>
                            {loadingToMap ? 'Cargando...' : 'Cargar en mapa'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </div>
    );
};
