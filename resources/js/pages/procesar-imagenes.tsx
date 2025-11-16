import React, { useState, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileImage, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from '@/lib/axios';

interface Workspace {
    _id: string;
    name: string;
}

interface Props {
    auth: {
        user: {
            name: string;
            email: string;
        };
    };
    workspaces: Workspace[];
}

type IndexType = 'ndvi' | 'ndwi' | 'msi';

interface ProcessingState {
    isProcessing: boolean;
    progress: number;
    message: string;
}

export default function ProcesarImagenes({ auth, workspaces }: Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
    const [selectedIndex, setSelectedIndex] = useState<IndexType>('ndvi');
    const [dragActive, setDragActive] = useState(false);
    const [processing, setProcessing] = useState<ProcessingState>({
        isProcessing: false,
        progress: 0,
        message: ''
    });
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [useMultipleBands, setUseMultipleBands] = useState(false);

    const acceptedFileTypes = ['.tif', '.tiff', '.jp2', '.png'];
    const maxFileSize = 50 * 1024 * 1024; // 50MB

    // Debug: Log state changes
    React.useEffect(() => {
        console.log('Estado actual:', {
            selectedFile: selectedFile?.name,
            selectedFiles: selectedFiles.map(f => f.name),
            useMultipleBands,
            selectedWorkspace,
            selectedIndex,
            isProcessing: processing.isProcessing,
            buttonEnabled: !!(
                (selectedFile || (useMultipleBands && selectedFiles.length > 0)) && 
                selectedWorkspace && 
                !processing.isProcessing
            )
        });
    }, [selectedFile, selectedFiles, useMultipleBands, selectedWorkspace, selectedIndex, processing.isProcessing]);

    // Debug: Log workspaces on mount
    React.useEffect(() => {
        console.log('Workspaces disponibles:', workspaces);
        if (workspaces && workspaces.length > 0) {
            console.log('Primer workspace:', workspaces[0]);
            console.log('Tiene _id?', '_id' in workspaces[0]);
            console.log('Tiene id?', 'id' in workspaces[0]);
        }
    }, []);

    const validateFile = (file: File): string | null => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!acceptedFileTypes.includes(extension)) {
            return `Tipo de archivo no válido. Acepta: ${acceptedFileTypes.join(', ')}`;
        }
        if (file.size > maxFileSize) {
            return `El archivo es muy grande. Máximo: 50MB`;
        }
        return null;
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        setError('');
        setSuccess('');

        if (e.dataTransfer.files) {
            if (useMultipleBands) {
                // Handle multiple files
                const files = Array.from(e.dataTransfer.files);
                const validFiles: File[] = [];
                const errors: string[] = [];
                
                files.forEach(file => {
                    const validationError = validateFile(file);
                    if (validationError) {
                        errors.push(`${file.name}: ${validationError}`);
                    } else {
                        validFiles.push(file);
                    }
                });
                
                if (errors.length > 0) {
                    setError(errors.join('\n'));
                }
                if (validFiles.length > 0) {
                    setSelectedFiles(prev => [...prev, ...validFiles]);
                }
            } else {
                // Handle single file
                const file = e.dataTransfer.files[0];
                const validationError = validateFile(file);
                if (validationError) {
                    setError(validationError);
                    return;
                }
                setSelectedFile(file);
            }
        }
    }, [useMultipleBands]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError('');
        setSuccess('');
        if (e.target.files) {
            if (useMultipleBands) {
                // Handle multiple files
                const files = Array.from(e.target.files);
                const validFiles: File[] = [];
                const errors: string[] = [];
                
                files.forEach(file => {
                    const validationError = validateFile(file);
                    if (validationError) {
                        errors.push(`${file.name}: ${validationError}`);
                    } else {
                        validFiles.push(file);
                    }
                });
                
                if (errors.length > 0) {
                    setError(errors.join('\n'));
                }
                if (validFiles.length > 0) {
                    setSelectedFiles(prev => [...prev, ...validFiles]);
                }
            } else {
                // Handle single file
                const file = e.target.files[0];
                if (file) {
                    const validationError = validateFile(file);
                    if (validationError) {
                        setError(validationError);
                        return;
                    }
                    setSelectedFile(file);
                }
            }
        }
    };

    const handleProcess = async () => {
        // Validate inputs
        if (useMultipleBands) {
            if (selectedFiles.length === 0) {
                setError('Por favor selecciona al menos un archivo de banda');
                return;
            }
        } else {
            if (!selectedFile) {
                setError('Por favor selecciona un archivo');
                return;
            }
        }
        
        if (!selectedWorkspace) {
            setError('Por favor selecciona un workspace');
            return;
        }

        setError('');
        setSuccess('');
        setProcessing({
            isProcessing: true,
            progress: 10,
            message: 'Subiendo archivo(s)...'
        });

        const formData = new FormData();
        
        if (useMultipleBands) {
            // Send multiple files
            selectedFiles.forEach((file, index) => {
                formData.append('files[]', file);
            });
            formData.append('image_name', 'combined_bands');
        } else {
            // Send single file
            formData.append('file', selectedFile!);
            const imageName = selectedFile!.name.replace(/\.[^/.]+$/, '');
            formData.append('image_name', imageName);
        }
        
        formData.append('workspace_id', selectedWorkspace);
        formData.append('index_type', selectedIndex);

        try {
            setProcessing(prev => ({ ...prev, progress: 30, message: 'Procesando imagen...' }));

            const response = await axios.post('/image-processor/process', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 30) / (progressEvent.total || 1)
                    );
                    setProcessing(prev => ({
                        ...prev,
                        progress: 10 + percentCompleted
                    }));
                }
            });

            setProcessing(prev => ({ ...prev, progress: 80, message: 'Guardando resultados...' }));

            await new Promise(resolve => setTimeout(resolve, 500));

            setProcessing(prev => ({ ...prev, progress: 100, message: 'Completado!' }));

            setSuccess(`Imagen procesada exitosamente. ${response.data.files_created} archivos guardados en el workspace.`);

            // Reset form
            setSelectedFile(null);
            setSelectedFiles([]);
            setSelectedIndex('ndvi');

            // Redirect to workspace images after 2 seconds
            setTimeout(() => {
                router.visit(`/workspaces/${selectedWorkspace}/images`);
            }, 2000);

        } catch (err: any) {
            console.error('Error processing image:', err);
            let errorMessage = err.response?.data?.details?.message ||
                               err.response?.data?.error || 
                               err.response?.data?.message || 
                               'Error al procesar la imagen';
            
            // Add helpful message if it's a band count issue
            if (errorMessage.includes('bandas no soportada') || errorMessage.includes('banda SWIR')) {
                errorMessage += '\n\n💡 Solución: Puedes cargar múltiples archivos de bandas para combinarlas automáticamente.';
            }
            
            setError(errorMessage);
            setProcessing({
                isProcessing: false,
                progress: 0,
                message: ''
            });
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Procesar Imágenes', href: '/procesar-imagenes' }
        ]}>
            <Head title="Procesar Imágenes" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Procesar Imágenes Satelitales</CardTitle>
                            <CardDescription>
                                Sube una imagen satelital y procésala con índices espectrales (NDVI, NDWI, MSI)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Multiple Files Toggle */}
                            <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded">
                                <input
                                    type="checkbox"
                                    id="multiple-bands"
                                    checked={useMultipleBands}
                                    onChange={(e) => {
                                        setUseMultipleBands(e.target.checked);
                                        setSelectedFile(null);
                                        setSelectedFiles([]);
                                        setError('');
                                    }}
                                    className="w-4 h-4"
                                    disabled={processing.isProcessing}
                                />
                                <label htmlFor="multiple-bands" className="text-sm font-medium cursor-pointer">
                                    Cargar múltiples archivos de bandas para combinarlas
                                </label>
                            </div>

                            {/* File Upload Area */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {useMultipleBands ? 'Archivos de bandas' : 'Archivo de imagen'}
                                </label>
                                <div
                                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                        dragActive
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-300 hover:border-gray-400'
                                    } ${selectedFile ? 'bg-green-50 border-green-300' : ''}`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        type="file"
                                        id="file-upload"
                                        className="hidden"
                                        accept={acceptedFileTypes.join(',')}
                                        onChange={handleFileChange}
                                        disabled={processing.isProcessing}
                                        multiple={useMultipleBands}
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <div className="space-y-2">
                                            {useMultipleBands ? (
                                                // Multiple files view
                                                selectedFiles.length > 0 ? (
                                                    <>
                                                        <FileImage className="mx-auto h-12 w-12 text-green-500" />
                                                        <div className="text-sm font-medium text-green-700">
                                                            {selectedFiles.length} archivo(s) seleccionado(s)
                                                        </div>
                                                        <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
                                                            {selectedFiles.map((f, i) => (
                                                                <div key={i}>{f.name}</div>
                                                            ))}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                                        <div className="text-sm text-gray-600">
                                                            <span className="font-semibold text-primary">
                                                                Click para subir
                                                            </span>{' '}
                                                            o arrastra y suelta múltiples archivos
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            TIF, TIFF, JP2 o PNG (máx. 50MB c/u)
                                                        </div>
                                                    </>
                                                )
                                            ) : (
                                                // Single file view
                                                selectedFile ? (
                                                    <>
                                                        <FileImage className="mx-auto h-12 w-12 text-green-500" />
                                                        <div className="text-sm font-medium text-green-700">
                                                            {selectedFile.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                                        <div className="text-sm text-gray-600">
                                                            <span className="font-semibold text-primary">
                                                                Click para subir
                                                            </span>{' '}
                                                            o arrastra y suelta
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            TIF, TIFF, JP2 o PNG (máx. 50MB)
                                                        </div>
                                                    </>
                                                )
                                            )}
                                        </div>
                                    </label>
                                    {(selectedFile || selectedFiles.length > 0) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setSelectedFiles([]);
                                            }}
                                            disabled={processing.isProcessing}
                                        >
                                            Limpiar archivos
                                        </Button>
                                    )}
                                </div>
                                <div className="text-xs text-gray-600 mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                    <strong>Requisitos de la imagen:</strong>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>Mínimo 3 bandas espectrales (RGB + NIR) para NDVI</li>
                                        <li>Mínimo 5 bandas (incluye SWIR) para NDWI y MSI</li>
                                        <li>Formatos soportados: TIF, TIFF, JP2, PNG</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Workspace Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Workspace de destino</label>
                                <Select
                                    value={selectedWorkspace}
                                    onValueChange={setSelectedWorkspace}
                                    disabled={processing.isProcessing}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un workspace" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {workspaces.map((workspace) => {
                                            const workspaceId = workspace._id || (workspace as any).id;
                                            return (
                                                <SelectItem key={workspaceId} value={workspaceId}>
                                                    {workspace.name}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Index Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Índice espectral</label>
                                <Select
                                    value={selectedIndex}
                                    onValueChange={(value) => setSelectedIndex(value as IndexType)}
                                    disabled={processing.isProcessing}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ndvi">
                                            NDVI - Índice de Vegetación de Diferencia Normalizada
                                        </SelectItem>
                                        <SelectItem value="ndwi">
                                            NDWI - Índice de Agua de Diferencia Normalizada
                                        </SelectItem>
                                        <SelectItem value="msi">
                                            MSI - Índice de Estrés Hídrico
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {selectedIndex === 'ndvi' && 'Mide la salud de la vegetación'}
                                    {selectedIndex === 'ndwi' && 'Detecta contenido de agua en la vegetación'}
                                    {selectedIndex === 'msi' && 'Evalúa el estrés hídrico de las plantas'}
                                </p>
                            </div>

                            {/* Processing Progress */}
                            {processing.isProcessing && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{processing.message}</span>
                                        <span className="text-gray-500">{processing.progress}%</span>
                                    </div>
                                    <Progress value={processing.progress} />
                                </div>
                            )}

                            {/* Error Alert */}
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* Success Alert */}
                            {success && (
                                <Alert className="border-green-200 bg-green-50">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800">
                                        {success}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Process Button */}
                            <Button
                                onClick={handleProcess}
                                disabled={
                                    (!selectedFile && (useMultipleBands ? selectedFiles.length === 0 : true)) || 
                                    !selectedWorkspace || 
                                    processing.isProcessing
                                }
                                className="w-full"
                                size="lg"
                            >
                                {processing.isProcessing ? 'Procesando...' : 'Procesar Imagen'}
                            </Button>

                            {/* Debug Info */}
                            <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                                <div>Modo: {useMultipleBands ? 'Múltiples bandas' : 'Archivo único'}</div>
                                <div>Archivo único: {selectedFile ? '✓ ' + selectedFile.name : '✗ No seleccionado'}</div>
                                <div>Archivos múltiples: {selectedFiles.length > 0 ? `✓ ${selectedFiles.length} archivo(s)` : '✗ Ninguno'}</div>
                                <div>Workspace: {selectedWorkspace ? '✓ Seleccionado' : '✗ No seleccionado'}</div>
                                <div>Índice: {selectedIndex.toUpperCase()}</div>
                                <div>Botón: {(
                                    (!selectedFile && (useMultipleBands ? selectedFiles.length === 0 : true)) || 
                                    !selectedWorkspace || 
                                    processing.isProcessing
                                ) ? 'DESHABILITADO' : 'HABILITADO'}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
