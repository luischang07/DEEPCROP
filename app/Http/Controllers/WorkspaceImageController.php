<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
use App\Models\WorkspaceImage;
use App\Services\ImageStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Exception;

class WorkspaceImageController extends Controller
{
    public function __construct(
        private ImageStorageService $imageStorageService
    ) {}

    /**
     * Subir una nueva imagen al workspace
     */
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'image' => 'required|file|max:512000', // 500MB max
                'name' => 'nullable|string|max:255',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos de entrada inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $image = $this->imageStorageService->uploadImage(
                $request->file('image'),
                $workspace,
                $request->user(),
                $request->input('name'),
                $request->input('tags', [])
            );

            return response()->json([
                'success' => true,
                'message' => 'Imagen subida exitosamente',
                'data' => array_merge($image->toArray(), [
                    'download_url' => $image->getTemporaryUrl(60),
                    'thumbnail_url' => $image->getThumbnailUrl(60),
                    'formatted_size' => $image->getFileSizeFormatted(),
                    'coordinates' => $image->getCoordinatesArray(),
                ])
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Listar imágenes del workspace
     */
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
                'search' => 'nullable|string|max:255',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Parámetros de consulta inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $result = $this->imageStorageService->getWorkspaceImages(
                $workspace,
                $request->user(),
                $request->input('page', 1),
                $request->input('per_page', 20),
                $request->input('search'),
                $request->input('tags')
            );

            return response()->json([
                'success' => true,
                'data' => $result
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 403);
        }
    }

    /**
     * Obtener detalles de una imagen específica
     */
    public function show(Request $request, Workspace $workspace, WorkspaceImage $image): JsonResponse
    {
        try {
            // Verificar que la imagen pertenece al workspace
            if ($image->workspace_id !== $workspace->_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Imagen no encontrada en este workspace'
                ], 404);
            }

            if (!$image->canView($request->user())) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para ver esta imagen'
                ], 403);
            }

            $image->load('uploadedBy:_id,name,email');

            return response()->json([
                'success' => true,
                'data' => array_merge($image->toArray(), [
                    'download_url' => $image->getTemporaryUrl(60),
                    'thumbnail_url' => $image->getThumbnailUrl(60),
                    'formatted_size' => $image->getFileSizeFormatted(),
                    'coordinates' => $image->getCoordinatesArray(),
                    'can_edit' => $image->canEdit($request->user()),
                    'can_delete' => $image->canDelete($request->user()),
                ])
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Actualizar metadatos de una imagen
     */
    public function update(Request $request, Workspace $workspace, WorkspaceImage $image): JsonResponse
    {
        try {
            // Verificar que la imagen pertenece al workspace
            if ($image->workspace_id !== $workspace->_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Imagen no encontrada en este workspace'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'nullable|string|max:255',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'center_lat' => 'nullable|numeric|between:-90,90',
                'center_lng' => 'nullable|numeric|between:-180,180',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos de entrada inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $updatedImage = $this->imageStorageService->updateImageMetadata(
                $image,
                $request->user(),
                $request->only(['name', 'tags', 'center_lat', 'center_lng'])
            );

            return response()->json([
                'success' => true,
                'message' => 'Imagen actualizada exitosamente',
                'data' => array_merge($updatedImage->toArray(), [
                    'download_url' => $updatedImage->getTemporaryUrl(60),
                    'thumbnail_url' => $updatedImage->getThumbnailUrl(60),
                    'formatted_size' => $updatedImage->getFileSizeFormatted(),
                    'coordinates' => $updatedImage->getCoordinatesArray(),
                ])
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], $e->getMessage() === 'No tienes permisos para editar esta imagen' ? 403 : 400);
        }
    }

    /**
     * Eliminar una imagen
     */
    public function destroy(Request $request, Workspace $workspace, WorkspaceImage $image): JsonResponse
    {
        try {
            // Verificar que la imagen pertenece al workspace
            if ($image->workspace_id !== $workspace->_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Imagen no encontrada en este workspace'
                ], 404);
            }

            $this->imageStorageService->deleteImage($image, $request->user());

            return response()->json([
                'success' => true,
                'message' => 'Imagen eliminada exitosamente'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], $e->getMessage() === 'No tienes permisos para eliminar esta imagen' ? 403 : 400);
        }
    }

    /**
     * Obtener estadísticas de imágenes del workspace
     */
    public function stats(Request $request, Workspace $workspace): JsonResponse
    {
        try {
            $stats = $this->imageStorageService->getWorkspaceImageStats(
                $workspace,
                $request->user()
            );

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 403);
        }
    }

    /**
     * Descargar imagen directamente (con autenticación)
     */
    public function download(Request $request, Workspace $workspace, WorkspaceImage $image)
    {
        try {
            // Verificar que la imagen pertenece al workspace
            if ($image->workspace_id !== $workspace->_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Imagen no encontrada en este workspace'
                ], 404);
            }

            if (!$image->canView($request->user())) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para descargar esta imagen'
                ], 403);
            }

            // Si es request de preview, devolver la imagen directamente
            if ($request->has('preview')) {
                try {
                    // Para archivos TIFF, intentar convertir a JPEG para mejor compatibilidad
                    $isTiff = str_contains($image->mime_type, 'tiff') || 
                              str_contains($image->mime_type, 'tif') ||
                              str_ends_with(strtolower($image->original_name), '.tiff') ||
                              str_ends_with(strtolower($image->original_name), '.tif');
                              
                    error_log("Preview request para: " . $image->original_name . " - MIME: " . $image->mime_type . " - Es TIFF: " . ($isTiff ? 'SI' : 'NO'));
                    
                    if ($isTiff) {
                        error_log("Intentando obtener preview TIFF convertido");
                        $convertedStream = $this->imageStorageService->getTiffPreview($image);
                        if ($convertedStream) {
                            error_log("Preview TIFF encontrado, enviando respuesta");
                            return response()->stream(
                                function () use ($convertedStream) {
                                    fpassthru($convertedStream);
                                    fclose($convertedStream);
                                },
                                200,
                                [
                                    'Content-Type' => 'image/jpeg',
                                    'Content-Disposition' => 'inline; filename="preview_' . pathinfo($image->original_name, PATHINFO_FILENAME) . '.jpg"',
                                    'Cache-Control' => 'public, max-age=3600',
                                ]
                            );
                        } else {
                            error_log("No se pudo obtener preview TIFF, devolviendo imagen original");
                        }
                    }
                    
                    // Para otros formatos o si la conversión falla, devolver original
                    $fileStream = $this->imageStorageService->getImageStream($image);
                    
                    return response()->stream(
                        function () use ($fileStream) {
                            fpassthru($fileStream);
                            fclose($fileStream);
                        },
                        200,
                        [
                            'Content-Type' => $image->mime_type,
                            'Content-Disposition' => 'inline; filename="' . $image->original_name . '"',
                            'Cache-Control' => 'public, max-age=3600',
                        ]
                    );
                } catch (Exception $e) {
                    // Si todo falla, devolver imagen de error o placeholder
                    return response()->json([
                        'success' => false,
                        'message' => 'Error al procesar la imagen para vista previa'
                    ], 500);
                }
            }

            // Generar URL temporal más larga para descarga
            $downloadUrl = $image->getTemporaryUrl(240); // 4 horas

            return response()->json([
                'success' => true,
                'data' => [
                    'download_url' => $downloadUrl,
                    'filename' => $image->original_name,
                    'expires_at' => now()->addMinutes(240)->toISOString(),
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Obtener todas las tags únicas del workspace
     */
    public function tags(Request $request, Workspace $workspace): JsonResponse
    {
        try {
            if (!$workspace->hasPermission($request->user(), 'read')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para ver las tags de este workspace'
                ], 403);
            }

            // Obtener todas las tags únicas del workspace
            $images = WorkspaceImage::where('workspace_id', $workspace->_id)
                ->whereNotNull('tags')
                ->pluck('tags')
                ->flatten()
                ->unique()
                ->sort()
                ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'tags' => $images
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Subir múltiples imágenes
     */
    public function bulkStore(Request $request, Workspace $workspace): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'images' => 'required|array|max:10', // Máximo 10 imágenes por lote
                'images.*' => 'file|max:512000', // 500MB max por imagen
                'default_tags' => 'nullable|array',
                'default_tags.*' => 'string|max:50',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos de entrada inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $results = [];
            $errors = [];
            $defaultTags = $request->input('default_tags', []);

            foreach ($request->file('images') as $index => $file) {
                try {
                    $image = $this->imageStorageService->uploadImage(
                        $file,
                        $workspace,
                        $request->user(),
                        null, // Usar nombre original
                        $defaultTags
                    );

                    $results[] = [
                        'index' => $index,
                        'success' => true,
                        'image' => array_merge($image->toArray(), [
                            'download_url' => $image->getTemporaryUrl(60),
                            'formatted_size' => $image->getFileSizeFormatted(),
                        ])
                    ];
                } catch (Exception $e) {
                    $errors[] = [
                        'index' => $index,
                        'filename' => $file->getClientOriginalName(),
                        'error' => $e->getMessage()
                    ];
                }
            }

            return response()->json([
                'success' => count($errors) === 0,
                'message' => sprintf(
                    'Procesadas %d imágenes. %d exitosas, %d con errores.',
                    count($results) + count($errors),
                    count($results),
                    count($errors)
                ),
                'data' => [
                    'successful_uploads' => $results,
                    'failed_uploads' => $errors,
                ]
            ], count($errors) > 0 ? 207 : 201); // 207 Multi-Status si hay errores parciales

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}