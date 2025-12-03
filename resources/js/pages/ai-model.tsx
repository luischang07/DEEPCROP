import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Upload, Play, Settings, RefreshCw, AlertCircle, CheckCircle, FileImage, Database, Activity } from 'lucide-react';
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
  status: string;
  progress: number;
  output_path?: string;
  stats?: {
    anomaly_percentage: number;
  };
  error_message?: string;
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

export default function AIModel() {
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [result, setResult] = useState<InferenceStatus | null>(null);
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
            setStatusMessage('Prediction completed!');
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 flex flex-col">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Play className="mr-2" size={20} /> Status & Results</h2>
              <div className="flex-1 flex flex-col justify-center">
                {result && (
                  <div className="bg-green-50 text-green-700 p-4 rounded-md mb-4">
                    <div className="flex items-center mb-2"><CheckCircle className="mr-2" size={20} /><span className="font-bold">Prediction Completed!</span></div>
                    <p>Output: {result.output_path}</p>
                    <p>Anomaly Percentage: {result.stats?.anomaly_percentage.toFixed(2)}%</p>
                  </div>
                )}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1"><span>{statusMessage}</span><span>{progress}%</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-300 ${result ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
                <button onClick={startPrediction} disabled={!selectedFile || !selectedModel || isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                  {isProcessing ? 'Processing...' : 'Start Prediction'}
                </button>
              </div>
            </div>
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
