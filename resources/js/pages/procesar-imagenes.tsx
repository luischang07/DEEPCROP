import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Upload, Play, Settings, X, FileImage } from 'lucide-react';
import { useState, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Procesar Imagenes',
        href: '/procesar-imagenes',
    },
];

export default function ProcesarImagenes() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageName, setImageName] = useState('');
    const [analysisType, setAnalysisType] = useState('ndvi');
    const [resolution, setResolution] = useState('media');
    const [autoSave, setAutoSave] = useState(true);
    const [notification, setNotification] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        if (file && (file.type.startsWith('image/') || file.type === 'image/tiff')) {
            setSelectedFile(file);
            if (!imageName) {
                setImageName(file.name.replace(/\.[^/.]+$/, ""));
            }
        } else {
            alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, TIFF)');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setImageName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleProcessImage = async () => {
        if (!selectedFile) {
            alert('Por favor selecciona una imagen primero');
            return;
        }

        setIsProcessing(true);
        setProgress(0);

        // Simular procesamiento con actualizaciones de progreso
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsProcessing(false);
                    alert('¡Procesamiento completado exitosamente!');
                    return 100;
                }
                return prev + Math.random() * 15;
            });
        }, 500);

        // Aquí va la lógica real de procesamiento
        /*
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('name', imageName);
        formData.append('analysisType', analysisType);
        formData.append('resolution', resolution);
        
        try {
            const response = await fetch('/api/process-image', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            // Manejar resultado
        } catch (error) {
            console.error('Error procesando imagen:', error);
        }
        */
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getEstimatedTime = () => {
        if (!selectedFile) return '-- minutos';
        
        const fileSizeMB = selectedFile.size / (1024 * 1024);
        let baseTime = 2; // 2 minutos base
        
        // Ajustar tiempo según resolución
        if (resolution === 'alta') baseTime *= 2;
        if (resolution === 'baja') baseTime *= 0.5;
        
        // Ajustar tiempo según tamaño de archivo
        const timeMultiplier = Math.max(1, fileSizeMB / 10);
        
        const estimatedMinutes = Math.ceil(baseTime * timeMultiplier);
        return `${estimatedMinutes} minuto${estimatedMinutes !== 1 ? 's' : ''}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Procesar Imagenes" />
            
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Procesar Imagenes</h1>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Panel de carga de imágenes */}
                    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Upload className="mr-2" size={20} />
                            Cargar Nueva Imagen
                        </h2>
                        
                        {!selectedFile ? (
                            <div 
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                                    ${dragOver 
                                        ? 'border-blue-500 bg-blue-50' 
                                        : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                                <p className="text-gray-600 mb-2">Arrastra y suelta tu imagen aquí, o</p>
                                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium">
                                    Seleccionar archivo
                                </button>
                                <p className="text-sm text-gray-500 mt-2">Formatos soportados: JPG, PNG, TIFF</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,.tiff,.tif"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                />
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                        <FileImage className="text-blue-500 mr-3" size={24} />
                                        <div>
                                            <p className="font-medium text-gray-900">{selectedFile.name}</p>
                                            <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRemoveFile}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                
                                {/* Vista previa de la imagen */}
                                <div className="mt-3">
                                    <img
                                        src={URL.createObjectURL(selectedFile)}
                                        alt="Vista previa"
                                        className="w-full h-32 object-cover rounded-md border"
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre de la imagen
                            </label>
                            <input
                                type="text"
                                value={imageName}
                                onChange={(e) => setImageName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Campo Norte - Agosto 2025"
                            />
                        </div>
                    </div>
                    
                    {/* Panel de configuración de procesamiento */}
                    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Settings className="mr-2" size={20} />
                            Configuración de Procesamiento
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Análisis
                                </label>
                                <select 
                                    value={analysisType}
                                    onChange={(e) => setAnalysisType(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ndvi">Índice de Vegetación (NDVI)</option>
                                    <option value="crop-detection">Detección de Cultivos</option>
                                    <option value="health-analysis">Análisis de Salud del Cultivo</option>
                                    <option value="pest-detection">Detección de Plagas</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Resolución de Procesamiento
                                </label>
                                <select 
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="alta">Alta (Proceso más lento)</option>
                                    <option value="media">Media (Recomendado)</option>
                                    <option value="baja">Baja (Proceso más rápido)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="flex items-center">
                                    <input 
                                        type="checkbox" 
                                        checked={autoSave}
                                        onChange={(e) => setAutoSave(e.target.checked)}
                                        className="mr-2" 
                                    />
                                    <span className="text-sm text-gray-700">Guardar resultado automáticamente</span>
                                </label>
                            </div>
                            
                            <div>
                                <label className="flex items-center">
                                    <input 
                                        type="checkbox" 
                                        checked={notification}
                                        onChange={(e) => setNotification(e.target.checked)}
                                        className="mr-2" 
                                    />
                                    <span className="text-sm text-gray-700">Enviar notificación al completar</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Panel de procesamiento */}
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Play className="mr-2" size={20} />
                        Iniciar Procesamiento
                    </h2>
                    
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 mb-2">
                                Imagen seleccionada: <span className="font-medium">
                                    {selectedFile ? selectedFile.name : 'Ninguna'}
                                </span>
                            </p>
                            <p className="text-gray-600">
                                Tiempo estimado: <span className="font-medium">{getEstimatedTime()}</span>
                            </p>
                        </div>
                        
                        <button 
                            onClick={handleProcessImage}
                            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-md font-medium flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                            disabled={!selectedFile || isProcessing}
                        >
                            <Play className="mr-2" size={16} />
                            {isProcessing ? 'Procesando...' : 'Procesar Imagen'}
                        </button>
                    </div>
                    
                    {/* Barra de progreso */}
                    {isProcessing && (
                        <div className="mt-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Procesando imagen...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
