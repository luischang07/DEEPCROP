<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Models\WorkspaceImage;
use App\Models\Workspace;
use App\Services\ImageStorageService;

class ImageProcessorController extends Controller
{
    protected $imageStorageService;
    protected $processorBaseUrl;

    public function __construct(ImageStorageService $imageStorageService)
    {
        $this->imageStorageService = $imageStorageService;
        $this->processorBaseUrl = env('IMAGE_PROCESSOR_URL', 'http://image-processor:5000');
    }

    /**
     * Obtiene los índices disponibles para procesamiento
     */
    public function getAvailableIndices()
    {
        try {
            $response = Http::timeout(10)->get("{$this->processorBaseUrl}/indices");

            if ($response->successful()) {
                return response()->json($response->json());
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch indices information'
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Error fetching available indices: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Image processor service unavailable'
            ], 503);
        }
    }

    /**
     * Procesa una imagen satelital y guarda el resultado en el workspace del usuario
     */
    public function processImage(Request $request)
    {
        try {
            // Check if multiple files or single file
            $isMultipleFiles = $request->has('files');
            
            // Validar la petición
            if ($isMultipleFiles) {
                $validated = $request->validate([
                    'files' => 'required|array|min:1',
                    'files.*' => 'file|mimes:tif,tiff,jp2,png|max:51200', // 50MB each
                    'workspace_id' => 'required|exists:workspaces,_id',
                    'image_name' => 'required|string|max:255',
                    'index_type' => 'required|in:ndvi,ndwi,msi',
                    'band_config' => 'sometimes|json'
                ]);
            } else {
                $validated = $request->validate([
                    'file' => 'required|file|mimes:tif,tiff,jp2,png|max:51200', // 50MB
                    'workspace_id' => 'required|exists:workspaces,_id',
                    'image_name' => 'required|string|max:255',
                    'index_type' => 'required|in:ndvi,ndwi,msi',
                    'band_config' => 'sometimes|json'
                ]);
            }

            // Verificar que el workspace pertenece al usuario
            $workspace = Workspace::where('_id', $validated['workspace_id'])
                ->where(function($query) {
                    $user = auth()->user();
                    $query->where('created_by', $user->_id)
                          ->orWhereHas('users', function($q) use ($user) {
                              $q->where('user_id', $user->_id);
                          });
                })
                ->first();

            if (!$workspace) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Workspace not found or access denied'
                ], 403);
            }

            // Preparar la petición al servicio de procesamiento
            $httpRequest = Http::timeout(300); // 5 minutos timeout para procesamiento
            
            if ($isMultipleFiles) {
                // Attach multiple files
                $files = $request->file('files');
                foreach ($files as $index => $file) {
                    $httpRequest->attach(
                        "files[]",
                        file_get_contents($file->path()),
                        $file->getClientOriginalName()
                    );
                }
            } else {
                // Attach single file
                $file = $request->file('file');
                $httpRequest->attach(
                    'file',
                    file_get_contents($file->path()),
                    $file->getClientOriginalName()
                );
            }
            
            // Add form data
            $formData = [
                'index_type' => $validated['index_type']
            ];
            
            if (isset($validated['band_config'])) {
                $formData['band_config'] = $validated['band_config'];
            }
            
            $response = $httpRequest->post("{$this->processorBaseUrl}/process", $formData);

            if (!$response->successful()) {
                Log::error('Image processor error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return response()->json([
                    'status' => 'error',
                    'message' => 'Failed to process image',
                    'details' => $response->json()
                ], $response->status());
            }

            $processingResult = $response->json();
            
            Log::info('Processing result received', [
                'status' => $processingResult['status'] ?? 'unknown',
                'results_count' => count($processingResult['results'] ?? []),
                'results_keys' => array_keys($processingResult['results'] ?? [])
            ]);

            // Descargar y guardar las imágenes procesadas en MinIO
            $savedFiles = [];
            
            foreach ($processingResult['results'] as $indexType => $indexData) {
                Log::info("Processing result for index: {$indexType}", [
                    'has_output_path' => isset($indexData['output_path']),
                    'has_error' => isset($indexData['error']),
                    'data' => $indexData
                ]);
                
                if (isset($indexData['output_path'])) {
                    // Obtener el nombre del archivo desde el path
                    $filename = basename($indexData['output_path']);
                    
                    // Descargar la imagen procesada del servicio
                    $imageResponse = Http::timeout(60)
                        ->get("{$this->processorBaseUrl}/download/{$indexType}/{$filename}");

                    Log::info("Download attempt for {$indexType}", [
                        'url' => "{$this->processorBaseUrl}/download/{$indexType}/{$filename}",
                        'successful' => $imageResponse->successful(),
                        'status' => $imageResponse->status(),
                        'size' => strlen($imageResponse->body())
                    ]);

                    if ($imageResponse->successful()) {
                        // Generar nombre único para el archivo
                        $uniqueFilename = sprintf(
                            '%s_%s_%s.png',
                            $validated['image_name'],
                            $indexType,
                            now()->format('YmdHis')
                        );

                        Log::info("Storing file in MinIO", [
                            'filename' => $uniqueFilename,
                            'workspace_id' => $workspace->_id,
                            'size' => strlen($imageResponse->body())
                        ]);

                        // Guardar en MinIO usando el servicio
                        $storedPath = $this->imageStorageService->storeProcessedImage(
                            $imageResponse->body(),
                            $uniqueFilename,
                            $workspace->_id
                        );

                        Log::info("File stored successfully", [
                            'path' => $storedPath
                        ]);

                        // Registrar en la base de datos como WorkspaceImage
                        $workspaceImage = new WorkspaceImage();
                        $workspaceImage->workspace_id = $workspace->_id;
                        $workspaceImage->name = $uniqueFilename;
                        
                        // Get original filename(s)
                        if ($isMultipleFiles) {
                            $originalNames = collect($request->file('files'))->map(fn($f) => $f->getClientOriginalName())->join(', ');
                            $workspaceImage->original_name = $originalNames;
                        } else {
                            $workspaceImage->original_name = $request->file('file')->getClientOriginalName();
                        }
                        
                        $workspaceImage->file_path = $storedPath;
                        $workspaceImage->mime_type = 'image/png';
                        $workspaceImage->file_size = strlen($imageResponse->body());
                        $workspaceImage->is_processed = true;
                        $workspaceImage->tags = ['processed', $indexType]; // Agregar tags por defecto
                        $workspaceImage->metadata = [
                            'index_type' => $indexType,
                            'index_name' => $indexData['index_name'] ?? $indexType,
                            'statistics' => $indexData['statistics'] ?? null,
                            'processing_date' => now()->toIso8601String(),
                            'original_file' => $isMultipleFiles ? $originalNames : $request->file('file')->getClientOriginalName(),
                            'multiple_bands' => $isMultipleFiles,
                            'band_count' => $isMultipleFiles ? count($request->file('files')) : 1
                        ];
                        $workspaceImage->uploaded_by = auth()->id();
                        $workspaceImage->save();

                        $savedFiles[] = [
                            'index_type' => $indexType,
                            'image_id' => $workspaceImage->_id,
                            'filename' => $uniqueFilename,
                            'file_path' => $storedPath,
                            'statistics' => $indexData['statistics'] ?? null,
                            'url' => url("/api/workspaces/{$workspace->_id}/images/{$workspaceImage->_id}/download")
                        ];
                    } else {
                        Log::warning("Failed to download image from processor", [
                            'index_type' => $indexType,
                            'status' => $imageResponse->status(),
                            'url' => "{$this->processorBaseUrl}/download/{$indexType}/{$filename}"
                        ]);
                    }
                } else {
                    Log::warning("Result has no output_path", [
                        'index_type' => $indexType,
                        'data' => $indexData
                    ]);
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Image processed successfully',
                'workspace_id' => $workspace->_id,
                'workspace_name' => $workspace->name,
                'files_created' => count($savedFiles),
                'processed_files' => $savedFiles,
                'processing_details' => $processingResult
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('Image processing error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while processing the image',
                'details' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Verifica el estado del servicio de procesamiento
     */
    public function healthCheck()
    {
        try {
            $response = Http::timeout(5)->get("{$this->processorBaseUrl}/health");

            return response()->json([
                'status' => 'success',
                'processor_status' => $response->successful() ? 'online' : 'offline',
                'processor_response' => $response->json()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'processor_status' => 'offline',
                'message' => 'Image processor service unavailable'
            ], 503);
        }
    }
}
