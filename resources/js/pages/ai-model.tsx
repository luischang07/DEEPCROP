import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { 
  Upload, Play, Settings, RefreshCw, AlertCircle, CheckCircle, 
  FileImage, Database, Activity, Download, FileText, Image as ImageIcon 
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'AI Model Manager',
    href: '/ai-model',
  },
];

interface Model {
  model_id: string;
  final_iou: number;
}

interface InferenceStatus {
  job_id?: string;
  status: string;
  progress: number;
  output_path?: string;
  preview_url?: string;
  stats?: {
    anomaly_percentage: number;
  };
  stress_severity?: string;
  anomaly_percentage_in_crop?: number;
  job_metadata?: {
    preview_path?: string;
    mask_path?: string;
    visualization_path?: string;
    minio_keys?: Record<string, string>;
  };
}

interface TrainingStatus {
  status: string;
  progress: number;
  current_epoch: number;
  total_epochs: number;
  metrics?: {
    loss: number;
    iou_score: number;
    val_loss: number;
    val_iou_score: number;
  };
  error_message?: string;
}

export default function AIModel({ workspaces = [] }: { workspaces: { id: string, name: string }[] }) {
  const [activeTab, setActiveTab] = useState<'inference' | 'training' | 'upload'>('inference');

  // Common State
  const [models, setModels] = useState<Model[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Inference State
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const [stride, setStride] = useState(256);
  const [useWaterStress, setUseWaterStress] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces.length > 0 ? workspaces[0].id : '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [result, setResult] = useState<InferenceStatus | null>(null);
  const [latestInferences, setLatestInferences] = useState<InferenceStatus[]>([]);
  const [previewType, setPreviewType] = useState('preview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Training State
  const [trainConfig, setTrainConfig] = useState({
    images_folder: '',
    masks_folder: '',
    epochs: 50,
    batch_size: 8,
    patch_size: 256,
    stride: 128
  });
  const [isTraining, setIsTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);
  const [trainStatus, setTrainStatus] = useState<TrainingStatus | null>(null);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      loadLatestInferences(selectedWorkspace);
    }
  }, [selectedWorkspace]);

  const loadLatestInferences = async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/ai/inferences?workspace_id=${workspaceId}`);
      const data = await response.json();
      setLatestInferences(data || []);
      if (data && data.length > 0 && !isProcessing) {
        setResult(data[0]);
        if (data[0].job_metadata?.visualization_path || data[0].stress_severity) {
          setPreviewType('visualization');
        } else {
          setPreviewType('preview');
        }
      }
    } catch (err) {
      console.error('Error loading inferences:', err);
    }
  };

  const loadModels = async () => {
    try {
      const response = await fetch('/api/ai/models');
      const data = await response.json();
      if (data.models) {
        setModels(data.models);
        if (data.models.length > 0 && !selectedModel) {
          const defaultModel = data.models.find((m: Model) => m.model_id === 'autoencoder_20251109_233412');
          setSelectedModel(defaultModel ? defaultModel.model_id : data.models[0].model_id);
        }
      }
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load models.');
    }
  };

  // --- Inference Logic ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setError('');
    }
  };

  const startPrediction = async () => {
    if (!selectedFile || !selectedModel) return;

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Starting prediction...');
    setResult(null);
    setError('');

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('model_id', selectedModel);
    formData.append('threshold', threshold.toString());
    formData.append('stride', stride.toString());
    formData.append('use_water_stress', useWaterStress ? '1' : '0');
    if (selectedWorkspace) {
      formData.append('workspace_id', selectedWorkspace);
    }

    try {
      const response = await fetch('/api/ai/predict', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Prediction failed to start');
      }

      const data = await response.json();
      const jobId = data.job_id;
      pollStatus(jobId);

    } catch (err: any) {
      setError(err.message || 'Error starting prediction');
      setIsProcessing(false);
    }
  };

  const pollStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai/status/${jobId}`);
        const data = await response.json();

        setProgress(Math.round(data.progress * 100));
        setStatusMessage(`${data.status} - ${Math.round(data.progress * 100)}%`);

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          setIsProcessing(false);
          if (data.status === 'completed') {
            setResult(data);
            if (data.job_metadata?.visualization_path || data.stress_severity) {
              setPreviewType('visualization');
            } else {
              setPreviewType('preview');
            }
            setStatusMessage('Prediction completed!');
            if (selectedWorkspace) loadLatestInferences(selectedWorkspace);
          } else {
            setError(data.error_message || 'Prediction failed');
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 1000);
  };

  // --- Training Logic ---
  const startTraining = async () => {
    setIsTraining(true);
    setTrainProgress(0);
    setTrainStatus(null);
    setError('');

    try {
      const response = await fetch('/api/ai/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
          'Accept': 'application/json',
        },
        body: JSON.stringify(trainConfig)
      });

      if (!response.ok) throw new Error('Training failed to start');

      const data = await response.json();
      pollTrainingStatus(data.job_id);

    } catch (err: any) {
      setError(err.message || 'Error starting training');
      setIsTraining(false);
    }
  };

  const pollTrainingStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai/training/status/${jobId}`);
        const data = await response.json();
        setTrainStatus(data);
        setTrainProgress(Math.round(data.progress * 100));

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          setIsTraining(false);
          if (data.status === 'completed') {
            setSuccessMessage('Training completed successfully!');
            loadModels(); // Refresh list
          } else {
            setError(data.error_message || 'Training failed');
          }
        }
      } catch (err) {
        console.error('Error polling training:', err);
      }
    }, 2000);
  };

  // --- Upload Logic ---
  const handleUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    setError('');
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('description', uploadDesc);

    try {
      const response = await fetch('/api/ai/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || errData.error || 'Upload failed');
      }

      setSuccessMessage('Model uploaded successfully!');
      setUploadFile(null);
      setUploadDesc('');
      loadModels(); // Refresh list

    } catch (err: any) {
      setError(err.message || 'Error uploading model');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="AI Model Manager" />

      <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">AI Model Manager</h1>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('inference')}
            className={`py-2 px-4 font-medium ${activeTab === 'inference' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Inference
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`py-2 px-4 font-medium ${activeTab === 'training' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Training
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-4 font-medium ${activeTab === 'upload' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Upload Model
          </button>
        </div>

        {/* Global Messages */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center">
            <AlertCircle className="mr-2" size={20} />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 text-green-700 p-4 rounded-md flex items-center">
            <CheckCircle className="mr-2" size={20} />
            {successMessage}
          </div>
        )}

        {/* Inference Tab */}
        {activeTab === 'inference' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuration Card */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="mr-2" size={20} /> Configuration
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                    <div className="flex items-center gap-2">
                      <input type="file" accept=".tif,.tiff,image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                      <button onClick={() => fileInputRef.current?.click()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md border border-gray-300 flex items-center">
                        <Upload className="mr-2" size={16} /> Select Image
                      </button>
                      <span className="text-sm text-gray-600 truncate">{selectedFile ? selectedFile.name : 'No file selected'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                    <div className="flex gap-2">
                      <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        {models.map((m) => (
                          <option key={m.model_id} value={m.model_id}>{m.model_id} (IoU: {m.final_iou?.toFixed(3)})</option>
                        ))}
                      </select>
                      <button onClick={loadModels} className="p-2 bg-gray-100 rounded-md hover:bg-gray-200"><RefreshCw size={20} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Threshold</label>
                      <input type="number" step="0.05" min="0" max="1" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stride</label>
                      <input type="number" step="32" min="32" max="512" value={stride} onChange={(e) => setStride(parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <input
                      type="checkbox"
                      id="waterStress"
                      checked={useWaterStress}
                      onChange={(e) => setUseWaterStress(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="waterStress" className="text-sm font-medium text-gray-700">
                      Detección de Estrés Hídrico (6 canales - PlanetScope)
                    </label>
                  </div>

                  {workspaces.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Workspace (Destino MinIO)</label>
                      <select 
                        value={selectedWorkspace} 
                        onChange={(e) => setSelectedWorkspace(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {workspaces.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Results Card (Now only Status + Small Preview) */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 flex flex-col">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Play className="mr-2" size={20} /> Execution</h2>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{statusMessage}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all duration-300 ${result?.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={startPrediction} 
                    disabled={!selectedFile || !selectedModel || isProcessing} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
                  >
                    {isProcessing ? 'Processing...' : 'Start Prediction'}
                  </button>

                  {latestInferences.length > 0 && (
                    <div className="mt-2 text-sm">
                      <p className="font-medium text-gray-500 mb-2 border-b pb-1">Historial recientes:</p>
                      <div className="space-y-1">
                        {latestInferences.map(inf => (
                          <div 
                            key={inf.job_id} 
                            onClick={() => setResult(inf)}
                            className={`flex justify-between p-2 rounded cursor-pointer hover:bg-gray-50 ${result?.job_id === inf.job_id ? 'bg-blue-50 border-blue-200 border' : ''}`}
                          >
                            <span className="truncate max-w-[150px]">{inf.job_id}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${inf.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {inf.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Full Width Result Visualization */}
            {result && result.status === 'completed' && (
              <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <CheckCircle className="text-green-500" size={28} />
                      Resultados de la Inferencia
                    </h2>
                    <p className="text-gray-500">ID del Trabajo: {result.job_id}</p>
                  </div>
                  <div className="flex gap-3">
                    {(useWaterStress || result.stress_severity) && (
                      <button 
                        onClick={() => setPreviewType('visualization')}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${previewType === 'visualization' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        Visualización Detallada
                      </button>
                    )}
                    <button 
                      onClick={() => setPreviewType('preview')}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${previewType === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      Vista Previa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 space-y-6">
                    <div className="relative group">
                      <img
                        src={`/api/ai/preview/${result.job_id}?type=${previewType}`}
                        alt="Result Preview"
                        className="w-full h-auto rounded-xl border border-gray-200 shadow-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://placehold.co/800x600?text=Result+Image+Not+Found';
                        }}
                      />
                      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white">
                        CAPA: {previewType.toUpperCase()}
                      </div>
                    </div>

                    {/* Nueva sección de descargas en formato LISTA - Mejorado */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-50 pb-3">
                            <Download className="size-5 text-indigo-600" /> Resultados Disponibles para Descarga
                        </h3>
                        <div className="divide-y divide-gray-100">
                            {/* Fila: Imagen Original */}
                            <div className="flex items-center justify-between py-4 group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                        <ImageIcon className="size-6 text-gray-400 group-hover:text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 leading-tight">Imagen Original</p>
                                        <p className="text-sm text-gray-500">Imagen de entrada del análisis</p>
                                    </div>
                                </div>
                                <a 
                                    href={`/api/ai/preview/${result.job_id}?type=original`} 
                                    download={`${result.job_id}_original${result.job_metadata?.minio_keys?.original ? result.job_metadata.minio_keys.original.substring(result.job_metadata.minio_keys.original.lastIndexOf('.')) : ''}`}
                                    target="_blank"
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                                >
                                    <Download size={14} /> Descargar
                                </a>
                            </div>

                            {/* Fila: Capa Overlay */}
                            <div className="flex items-center justify-between py-4 group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                        <FileText className="size-6 text-gray-400 group-hover:text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 leading-tight">Capa Overlay (GeoTIFF)</p>
                                        <p className="text-sm text-gray-500">Transparencia y georreferencia incluida</p>
                                    </div>
                                </div>
                                <a 
                                    href={`/api/ai/preview/${result.job_id}?type=overlay`} 
                                    download={`${result.job_id}_overlay.tif`}
                                    target="_blank"
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                                >
                                    <Download size={14} /> Descargar
                                </a>
                            </div>

                            {/* Fila: Máscara Binaria */}
                            <div className="flex items-center justify-between py-4 group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                        <FileText className="size-6 text-gray-400 group-hover:text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 leading-tight">Máscara Binaria (GeoTIFF)</p>
                                        <p className="text-sm text-gray-500">Recorte exacto del modelo (0-1)</p>
                                    </div>
                                </div>
                                <a 
                                    href={`/api/ai/preview/${result.job_id}?type=mask`} 
                                    download={`${result.job_id}_mask.tif`}
                                    target="_blank"
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                                >
                                    <Download size={14} /> Descargar
                                </a>
                            </div>

                            {/* Fila: Visualización Detallada */}
                            <div className="flex items-center justify-between py-4 group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                        <ImageIcon className="size-6 text-gray-400 group-hover:text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 leading-tight">Visualización Detallada (PNG)</p>
                                        <p className="text-sm text-gray-500">Gráfico de resumen comparativo</p>
                                    </div>
                                </div>
                                <a 
                                    href={`/api/ai/preview/${result.job_id}?type=visualization`} 
                                    download={`${result.job_id}_visualization.png`}
                                    target="_blank"
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                                >
                                    <Download size={14} /> Descargar
                                </a>
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                      <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <Activity className="size-5" /> Estadísticas
                      </h3>
                      
                      {result.stress_severity ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-blue-700 text-sm">Severidad de Estrés:</p>
                            <p className="text-2xl font-black text-blue-900">{result.stress_severity}</p>
                          </div>
                          <div>
                            <p className="text-blue-700 text-sm">Cultivo Afectado:</p>
                            <p className="text-3xl font-black text-blue-900">{result.anomaly_percentage_in_crop?.toFixed(2)}%</p>
                            <div className="w-full bg-blue-200 rounded-full h-3 mt-1">
                              <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${result.anomaly_percentage_in_crop}%` }}></div>
                            </div>
                          </div>
                        </div>
                      ) : result.stats ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-blue-700 text-sm">Porcentaje de Anomalía:</p>
                            <p className="text-4xl font-black text-blue-900">{result.stats.anomaly_percentage.toFixed(2)}%</p>
                            <div className="w-full bg-blue-200 rounded-full h-3 mt-1">
                              <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${result.stats.anomaly_percentage}%` }}></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-blue-600">Procesando datos estadísticos...</p>
                      )}
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Información Técnica</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Modelo:</span>
                          <span className="font-mono font-medium">{result.job_id!.split('_')[0]}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Estado:</span>
                          <span className="text-green-600 font-bold uppercase">{result.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Workspace ID:</span>
                          <span className="font-mono text-xs">{selectedWorkspace}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Activity className="mr-2" size={20} /> Training Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images Folder (Absolute Path)</label>
                  <input type="text" value={trainConfig.images_folder} onChange={(e) => setTrainConfig({ ...trainConfig, images_folder: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="/path/to/images" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Masks Folder (Absolute Path)</label>
                  <input type="text" value={trainConfig.masks_folder} onChange={(e) => setTrainConfig({ ...trainConfig, masks_folder: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="/path/to/masks" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Epochs</label>
                    <input type="number" value={trainConfig.epochs} onChange={(e) => setTrainConfig({ ...trainConfig, epochs: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Batch Size</label>
                    <input type="number" value={trainConfig.batch_size} onChange={(e) => setTrainConfig({ ...trainConfig, batch_size: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                </div>
                <button onClick={startTraining} disabled={isTraining} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-md font-medium disabled:bg-gray-400">
                  {isTraining ? 'Training Started...' : 'Start Training'}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Progress</h2>
              {trainStatus ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Status: {trainStatus.status}</span>
                    <span>Epoch: {trainStatus.current_epoch}/{trainStatus.total_epochs}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${trainProgress}%` }}></div>
                  </div>
                  {trainStatus.metrics && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 p-2 rounded">Loss: {trainStatus.metrics.loss?.toFixed(4)}</div>
                      <div className="bg-gray-50 p-2 rounded">IoU: {trainStatus.metrics.iou_score?.toFixed(4)}</div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No active training job.</p>
              )}
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="max-w-xl mx-auto w-full bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Database className="mr-2" size={20} /> Upload Model</h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => uploadInputRef.current?.click()}>
                <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600">Click to select .pt file</p>
                <input type="file" accept=".pt" ref={uploadInputRef} onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="hidden" />
              </div>
              {uploadFile && (
                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md">
                  <span className="text-blue-700 font-medium">{uploadFile.name}</span>
                  <button onClick={() => setUploadFile(null)} className="text-red-500 hover:text-red-700">Remove</button>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3}></textarea>
              </div>
              <button onClick={handleUpload} disabled={!uploadFile || isUploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium disabled:bg-gray-400">
                {isUploading ? 'Uploading...' : 'Upload Model'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
