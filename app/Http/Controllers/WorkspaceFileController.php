<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
use App\Models\WorkspaceFile;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class WorkspaceFileController extends Controller
{
    public function index(Workspace $workspace): JsonResponse
    {
        $user = Auth::user();

        if (!$workspace->hasPermission($user, 'read')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para acceder a este espacio de trabajo',
            ], 403);
        }

        $files = $workspace->files()
            ->with('uploadedBy')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($file) {
                return [
                    'id' => $file->id,
                    'name' => $file->name,
                    'original_name' => $file->original_name,
                    'file_size' => $file->file_size,
                    'file_size_formatted' => $file->getFileSizeFormatted(),
                    'mime_type' => $file->mime_type,
                    'is_tiff' => $file->isTiff(),
                    'has_geospatial_data' => $file->hasGeospatialData(),
                    'coordinates' => $file->getCoordinatesArray(),
                    'is_processed' => $file->is_processed,
                    'processing_notes' => $file->processing_notes,
                    'metadata' => $file->metadata,
                    'uploaded_by' => [
                        'id' => $file->uploadedBy->id,
                        'name' => $file->uploadedBy->name,
                    ],
                    'created_at' => $file->created_at,
                    'updated_at' => $file->updated_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $files,
        ]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $user = Auth::user();

        if (!$workspace->hasPermission($user, 'write')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para subir archivos a este espacio',
            ], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:tiff,tif,png,jpg,jpeg|max:102400', // 100MB max
            'name' => 'nullable|string|max:255',
            'metadata' => 'nullable|string', // Metadata JSON desde frontend
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $fileName = $request->name ?: pathinfo($originalName, PATHINFO_FILENAME);
        
        // Generar nombre único para el archivo
        $uniqueName = Str::uuid() . '.' . $file->getClientOriginalExtension();
        
        // Guardar archivo en storage/app/workspace_files/{workspace_id}/
        $filePath = $file->storeAs("workspace_files/{$workspace->id}", $uniqueName, 'private');

        // Extraer metadatos si es posible
        $extractedMetadata = $this->extractFileMetadata($file);
        $geospatialData = $this->extractGeospatialData($file, $extractedMetadata);

        // Combinar metadata extraído con metadata del frontend (áreas seleccionadas)
        $combinedMetadata = $extractedMetadata;
        if ($request->has('metadata')) {
            $frontendMetadata = json_decode($request->metadata, true);
            if ($frontendMetadata) {
                $combinedMetadata = array_merge($extractedMetadata ?: [], [
                    'frontend_data' => $frontendMetadata
                ]);
            }
        }

        $workspaceFile = $workspace->files()->create([
            'uploaded_by' => $user->id,
            'name' => $fileName,
            'original_name' => $originalName,
            'file_path' => $filePath,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'metadata' => $combinedMetadata,
            'geospatial_bounds' => $geospatialData['bounds'] ?? null,
            'center_lat' => $geospatialData['center_lat'] ?? null,
            'center_lng' => $geospatialData['center_lng'] ?? null,
            'is_processed' => !empty($geospatialData),
        ]);

        $workspaceFile->load('uploadedBy');

        return response()->json([
            'success' => true,
            'message' => 'Archivo subido exitosamente',
            'data' => [
                'id' => $workspaceFile->id,
                'name' => $workspaceFile->name,
                'original_name' => $workspaceFile->original_name,
                'file_size' => $workspaceFile->file_size,
                'file_size_formatted' => $workspaceFile->getFileSizeFormatted(),
                'mime_type' => $workspaceFile->mime_type,
                'is_tiff' => $workspaceFile->isTiff(),
                'has_geospatial_data' => $workspaceFile->hasGeospatialData(),
                'coordinates' => $workspaceFile->getCoordinatesArray(),
                'is_processed' => $workspaceFile->is_processed,
                'uploaded_by' => [
                    'id' => $workspaceFile->uploadedBy->id,
                    'name' => $workspaceFile->uploadedBy->name,
                ],
                'created_at' => $workspaceFile->created_at,
            ],
        ], 201);
    }

    public function show(Workspace $workspace, WorkspaceFile $file): JsonResponse
    {
        $user = Auth::user();

        if (!$workspace->hasPermission($user, 'read') || $file->workspace_id !== $workspace->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para acceder a este archivo',
            ], 403);
        }

        $file->load('uploadedBy');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $file->id,
                'name' => $file->name,
                'original_name' => $file->original_name,
                'file_path' => $file->file_path,
                'file_size' => $file->file_size,
                'file_size_formatted' => $file->getFileSizeFormatted(),
                'mime_type' => $file->mime_type,
                'is_tiff' => $file->isTiff(),
                'has_geospatial_data' => $file->hasGeospatialData(),
                'coordinates' => $file->getCoordinatesArray(),
                'geospatial_bounds' => $file->geospatial_bounds,
                'center_lat' => $file->center_lat,
                'center_lng' => $file->center_lng,
                'metadata' => $file->metadata,
                'is_processed' => $file->is_processed,
                'processing_notes' => $file->processing_notes,
                'uploaded_by' => [
                    'id' => $file->uploadedBy->id,
                    'name' => $file->uploadedBy->name,
                    'email' => $file->uploadedBy->email,
                ],
                'created_at' => $file->created_at,
                'updated_at' => $file->updated_at,
            ],
        ]);
    }

    public function download(Workspace $workspace, WorkspaceFile $file)
    {
        $user = Auth::user();

        if (!$workspace->hasPermission($user, 'read') || $file->workspace_id !== $workspace->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para descargar este archivo',
            ], 403);
        }

        if (!Storage::disk('private')->exists($file->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'El archivo no fue encontrado',
            ], 404);
        }

        return Storage::disk('private')->download($file->file_path, $file->original_name);
    }

    public function update(Request $request, Workspace $workspace, WorkspaceFile $file): JsonResponse
    {
        $user = Auth::user();

        if (!$workspace->hasPermission($user, 'write') || $file->workspace_id !== $workspace->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para editar este archivo',
            ], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'processing_notes' => 'nullable|string|max:1000',
        ]);

        $file->update([
            'name' => $request->name,
            'processing_notes' => $request->processing_notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Archivo actualizado exitosamente',
            'data' => [
                'id' => $file->id,
                'name' => $file->name,
                'processing_notes' => $file->processing_notes,
                'updated_at' => $file->updated_at,
            ],
        ]);
    }

    public function destroy(Workspace $workspace, WorkspaceFile $file): JsonResponse
    {
        $user = Auth::user();

        if (!$workspace->hasPermission($user, 'write') || $file->workspace_id !== $workspace->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para eliminar este archivo',
            ], 403);
        }

        // Eliminar archivo físico
        if (Storage::disk('private')->exists($file->file_path)) {
            Storage::disk('private')->delete($file->file_path);
        }

        $file->delete();

        return response()->json([
            'success' => true,
            'message' => 'Archivo eliminado exitosamente',
        ]);
    }

    private function extractFileMetadata($file): array
    {
        $metadata = [];

        try {
            // Información básica del archivo
            $metadata['file_info'] = [
                'size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'original_name' => $file->getClientOriginalName(),
                'uploaded_at' => now()->toISOString(),
            ];

            // Si es una imagen, intentar extraer EXIF
            if (str_starts_with($file->getMimeType(), 'image/')) {
                $tempPath = $file->getPathname();
                
                if (function_exists('exif_read_data')) {
                    $exifData = @exif_read_data($tempPath);
                    if ($exifData) {
                        $metadata['exif'] = array_filter($exifData, function($value) {
                            return is_scalar($value) || is_array($value);
                        });
                    }
                }

                // Información básica de la imagen
                $imageInfo = @getimagesize($tempPath);
                if ($imageInfo) {
                    $metadata['image_info'] = [
                        'width' => $imageInfo[0],
                        'height' => $imageInfo[1],
                        'type' => $imageInfo[2],
                        'bits' => $imageInfo['bits'] ?? null,
                        'channels' => $imageInfo['channels'] ?? null,
                    ];
                }
            }

        } catch (\Exception $e) {
            $metadata['extraction_error'] = $e->getMessage();
        }

        return $metadata;
    }

    private function extractGeospatialData($file, array $metadata): array
    {
        $geospatialData = [];

        try {
            // Intentar extraer coordenadas de EXIF si están disponibles
            if (isset($metadata['exif'])) {
                $exif = $metadata['exif'];
                
                // GPS desde EXIF
                if (isset($exif['GPSLatitude'], $exif['GPSLongitude'])) {
                    $lat = $this->convertGPSToDecimal(
                        $exif['GPSLatitude'], 
                        $exif['GPSLatitudeRef'] ?? 'N'
                    );
                    $lng = $this->convertGPSToDecimal(
                        $exif['GPSLongitude'], 
                        $exif['GPSLongitudeRef'] ?? 'E'
                    );

                    if ($lat !== null && $lng !== null) {
                        $geospatialData['center_lat'] = $lat;
                        $geospatialData['center_lng'] = $lng;
                    }
                }
            }

            // Para archivos TIFF, intentar leer metadatos geoespaciales adicionales
            if (str_contains($file->getMimeType(), 'tiff')) {
                // Aquí se podría implementar lectura de GeoTIFF usando bibliotecas especializadas
                // Por ahora, usar metadatos básicos
            }

        } catch (\Exception $e) {
            // Log error but don't fail the upload
            \Log::warning('Error extracting geospatial data: ' . $e->getMessage());
        }

        return $geospatialData;
    }

    private function convertGPSToDecimal(array $gpsCoordinate, string $hemisphere): ?float
    {
        if (count($gpsCoordinate) !== 3) {
            return null;
        }

        try {
            $degrees = $this->parseGPSCoordinate($gpsCoordinate[0]);
            $minutes = $this->parseGPSCoordinate($gpsCoordinate[1]);
            $seconds = $this->parseGPSCoordinate($gpsCoordinate[2]);

            $decimal = $degrees + ($minutes / 60) + ($seconds / 3600);

            // Apply hemisphere
            if (in_array($hemisphere, ['S', 'W'])) {
                $decimal *= -1;
            }

            return $decimal;
        } catch (\Exception $e) {
            return null;
        }
    }

    private function parseGPSCoordinate($coordinate): float
    {
        if (is_string($coordinate) && str_contains($coordinate, '/')) {
            $parts = explode('/', $coordinate);
            return floatval($parts[0]) / floatval($parts[1]);
        }
        
        return floatval($coordinate);
    }
}
