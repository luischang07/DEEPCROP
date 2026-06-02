<?php

namespace App\Services;

use App\Models\Workspace;
use App\Models\WorkspaceImage;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class ImageStorageService
{
    private string $disk = 'minio';

    /**
     * Subir una imagen a un workspace
     */
    public function uploadImage(
        UploadedFile $file,
        Workspace $workspace,
        User $user,
        ?string $customName = null,
        ?array $tags = null
    ): WorkspaceImage {
        // Verificar permisos
        if (!$workspace->hasPermission($user, 'write')) {
            throw new Exception('No tienes permisos para subir imágenes a este workspace');
        }

        // Validar tipo de archivo
        $this->validateImageFile($file);

        // Generar nombres únicos
        $fileName = $this->generateUniqueFileName($file, $workspace);
        $filePath = $this->generateFilePath($workspace, $fileName);

        try {
            // Subir archivo a MinIO
            $uploadedPath = Storage::disk($this->disk)->putFileAs(
                dirname($filePath),
                $file,
                basename($filePath)
            );

            if (!$uploadedPath) {
                throw new Exception('Error al subir el archivo a MinIO');
            }

            // Extraer metadatos básicos
            $metadata = $this->extractBasicMetadata($file);

            // Crear registro en base de datos
            $workspaceImage = WorkspaceImage::create([
                'workspace_id' => $workspace->_id,
                'uploaded_by' => $user->_id,
                'name' => $customName ?? $file->getClientOriginalName(),
                'original_name' => $file->getClientOriginalName(),
                'file_path' => $uploadedPath,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'metadata' => $metadata,
                'tags' => $tags ?? [],
                'is_processed' => false,
            ]);

            // Procesar imagen en background (extraer coordenadas, crear thumbnail, etc.)
            $this->processImageAsync($workspaceImage);

            return $workspaceImage;

        } catch (Exception $e) {
            // Limpiar archivo si hubo error
            if (isset($uploadedPath) && is_string($uploadedPath) && Storage::disk($this->disk)->exists($uploadedPath)) {
                Storage::disk($this->disk)->delete($uploadedPath);
            }
            throw $e;
        }
    }

    /**
     * Obtener imágenes de un workspace con paginación
     */
    public function getWorkspaceImages(
        Workspace $workspace,
        User $user,
        int $page = 1,
        int $perPage = 20,
        ?string $search = null,
        ?array $tags = null
    ): array {
        // Verificar permisos
        if (!$workspace->hasPermission($user, 'read')) {
            throw new Exception('No tienes permisos para ver las imágenes de este workspace');
        }

        $query = WorkspaceImage::where('workspace_id', $workspace->_id)
            ->with('uploadedBy:_id,name,email');

        // Filtrar por búsqueda
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('original_name', 'like', "%{$search}%")
                  ->orWhere('tags', 'in', [$search]);
            });
        }

        // Filtrar por tags
        if ($tags && !empty($tags)) {
            $query->where('tags', 'in', $tags);
        }

        $total = $query->count();
        $images = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        // Generar URLs temporales
        $imagesWithUrls = $images->map(function ($image) {
            return array_merge($image->toArray(), [
                'download_url' => $image->getTemporaryUrl(60),
                'thumbnail_url' => $image->getThumbnailUrl(60),
                'formatted_size' => $image->getFileSizeFormatted(),
                'coordinates' => $image->getCoordinatesArray(),
                'can_edit' => $image->canEdit(auth()->user()),
                'can_delete' => $image->canDelete(auth()->user()),
            ]);
        });

        return [
            'images' => $imagesWithUrls,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
            ]
        ];
    }

    /**
     * Eliminar una imagen
     */
    public function deleteImage(WorkspaceImage $image, User $user): bool
    {
        if (!$image->canDelete($user)) {
            throw new Exception('No tienes permisos para eliminar esta imagen');
        }

        try {
            // El modelo se encarga de eliminar los archivos en MinIO
            return $image->delete();
        } catch (Exception $e) {
            throw new Exception('Error al eliminar la imagen: ' . $e->getMessage());
        }
    }

    /**
     * Actualizar metadatos de una imagen
     */
    public function updateImageMetadata(
        WorkspaceImage $image,
        User $user,
        array $data
    ): WorkspaceImage {
        if (!$image->canEdit($user)) {
            throw new Exception('No tienes permisos para editar esta imagen');
        }

        $allowedFields = ['name', 'tags', 'center_lat', 'center_lng'];
        $updateData = array_intersect_key($data, array_flip($allowedFields));

        $image->update($updateData);
        return $image->fresh();
    }

    /**
     * Obtener estadísticas de imágenes del workspace
     */
    public function getWorkspaceImageStats(Workspace $workspace, User $user): array
    {
        if (!$workspace->hasPermission($user, 'read')) {
            throw new Exception('No tienes permisos para ver las estadísticas de este workspace');
        }

        $images = WorkspaceImage::where('workspace_id', $workspace->_id);

        return [
            'total_images' => $images->count(),
            'total_size' => $images->sum('file_size'),
            'total_size_formatted' => $this->formatBytes($images->sum('file_size')),
            'images_by_type' => $this->getImagesByType($workspace),
            'images_with_coordinates' => $images->whereNotNull('center_lat')->count(),
            'recent_uploads' => $images->where('created_at', '>=', now()->subDays(7))->count(),
        ];
    }

    /**
     * Validar archivo de imagen
     */
    private function validateImageFile(UploadedFile $file): void
    {
        $allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/tiff',
            'image/tif',
            'image/jp2',
            'application/x-tiff',
        ];

        if (!in_array($file->getMimeType(), $allowedMimes)) {
            throw new Exception('Tipo de archivo no permitido. Solo se aceptan imágenes JPEG, PNG, TIFF y JP2.');
        }

        // Limitar tamaño (500MB por defecto)
        $maxSize = config('filesystems.max_image_size', 500 * 1024 * 1024);
        if ($file->getSize() > $maxSize) {
            throw new Exception('El archivo es demasiado grande. Máximo permitido: ' . $this->formatBytes($maxSize));
        }
    }

    /**
     * Generar nombre único para el archivo
     */
    private function generateUniqueFileName(UploadedFile $file, Workspace $workspace): string
    {
        $extension = $file->getClientOriginalExtension();
        $baseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safeName = Str::slug($baseName);
        
        return $safeName . '_' . time() . '_' . Str::random(8) . '.' . $extension;
    }

    /**
     * Generar ruta de archivo en MinIO
     */
    private function generateFilePath(Workspace $workspace, string $fileName): string
    {
        $workspaceType = $workspace->isPersonal() ? 'personal' : 'shared';
        $workspaceId = $workspace->_id;
        $year = date('Y');
        $month = date('m');

        return "images/{$workspaceType}/{$workspaceId}/{$year}/{$month}/{$fileName}";
    }

    /**
     * Extraer metadatos básicos del archivo
     */
    private function extractBasicMetadata(UploadedFile $file): array
    {
        $metadata = [
            'upload_timestamp' => now()->toISOString(),
            'original_extension' => $file->getClientOriginalExtension(),
        ];

        try {
            // Intentar extraer EXIF data si es posible
            if (in_array($file->getMimeType(), ['image/jpeg', 'image/tiff'])) {
                $exifData = @exif_read_data($file->getPathname());
                if ($exifData) {
                    $metadata['exif'] = $this->sanitizeExifData($exifData);
                }
            }
        } catch (Exception $e) {
            // Ignorar errores de EXIF
        }

        return $metadata;
    }

    /**
     * Limpiar datos EXIF sensibles
     */
    private function sanitizeExifData(array $exifData): array
    {
        $allowedKeys = [
            'DateTime',
            'Make',
            'Model',
            'Software',
            'ImageWidth',
            'ImageLength',
            'BitsPerSample',
            'Compression',
            'PhotometricInterpretation',
            'SamplesPerPixel',
            'XResolution',
            'YResolution',
            'ResolutionUnit',
        ];

        return array_intersect_key($exifData, array_flip($allowedKeys));
    }

    /**
     * Procesar imagen en background
     */
    private function processImageAsync(WorkspaceImage $image): void
    {
        // Procesamiento ligero en línea: crear thumbnail y extraer coordenadas si es posible
        try {
            $thumbnailPath = $this->createAndStoreThumbnail($image);

            $update = ['is_processed' => true, 'processing_notes' => 'Procesamiento básico completado'];
            if ($thumbnailPath) {
                $update['thumbnail_path'] = $thumbnailPath;
            }

            // Aquí podríamos intentar extraer coordenadas avanzadas en background;
            // por ahora confiamos en metadata ya extraída.

            $image->update($update);

        } catch (Exception $e) {
            // Never fail the upload if thumbnail generation fails
            Log::warning('Thumbnail generation failed for image ' . $image->_id . ': ' . $e->getMessage());
            $image->update(['is_processed' => false, 'processing_notes' => 'Thumbnail generation failed: ' . $e->getMessage()]);
        }
    }

    /**
     * Create a thumbnail for the image and store it in the disk. Returns thumbnail path or null.
     */
    private function createAndStoreThumbnail(WorkspaceImage $image): ?string
    {
        try {
            if (!Storage::disk($this->disk)->exists($image->file_path)) {
                throw new Exception('Original file not found for thumbnail generation');
            }

            $stream = Storage::disk($this->disk)->readStream($image->file_path);
            if (!$stream) {
                throw new Exception('Failed to read original file stream');
            }

            $contents = stream_get_contents($stream);
            fclose($stream);

            $maxDim = 400; // max thumbnail dimension

            // Try Imagick
            if (extension_loaded('imagick')) {
                try {
                    $im = new \Imagick();
                    $im->readImageBlob($contents);
                    $im->setImageFormat('jpeg');
                    $im->setImageCompressionQuality(80);

                    $width = $im->getImageWidth();
                    $height = $im->getImageHeight();
                    $ratio = min(1, $maxDim / max($width, $height));
                    if ($ratio < 1) {
                        $im->resizeImage((int)($width * $ratio), (int)($height * $ratio), \Imagick::FILTER_LANCZOS, 1);
                    }

                    $jpeg = $im->getImageBlob();
                    $im->destroy();
                } catch (Exception $e) {
                    // fallback to GD
                    $jpeg = null;
                }
            } else {
                $jpeg = null;
            }

            // Fallback to GD
            if ($jpeg === null && extension_loaded('gd')) {
                $img = @imagecreatefromstring($contents);
                if ($img !== false) {
                    $width = imagesx($img);
                    $height = imagesy($img);
                    $ratio = min(1, $maxDim / max($width, $height));
                    $newW = (int)($width * $ratio);
                    $newH = (int)($height * $ratio);

                    $thumb = imagecreatetruecolor($newW, $newH);
                    // Preserve transparency for PNG
                    imagealphablending($thumb, false);
                    imagesavealpha($thumb, true);
                    imagecopyresampled($thumb, $img, 0, 0, 0, 0, $newW, $newH, $width, $height);

                    ob_start();
                    imagejpeg($thumb, null, 80);
                    $jpeg = ob_get_clean();
                    imagedestroy($thumb);
                    imagedestroy($img);
                }
            }

            if (empty($jpeg)) {
                // Can't generate thumbnail
                return null;
            }

            // Build thumbnail path and store
            $thumbPath = preg_replace('/\/([^\/]+)$/', '/thumbnails/$1', $image->file_path);
            // Ensure thumbnails directory exists; put will create it
            Storage::disk($this->disk)->put($thumbPath, $jpeg);

            return $thumbPath;
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * Obtener estadísticas por tipo de imagen
     */
    private function getImagesByType(Workspace $workspace): array
    {
        $images = WorkspaceImage::where('workspace_id', $workspace->_id)
            ->get()
            ->groupBy('mime_type');

        $stats = [];
        foreach ($images as $mimeType => $imageGroup) {
            $stats[$mimeType] = [
                'count' => $imageGroup->count(),
                'total_size' => $imageGroup->sum('file_size'),
            ];
        }

        return $stats;
    }

    /**
     * Obtener stream de imagen para preview
     */
    public function getImageStream(WorkspaceImage $image)
    {
        if (!Storage::disk($this->disk)->exists($image->file_path)) {
            throw new Exception('Archivo de imagen no encontrado en el almacenamiento');
        }

        return Storage::disk($this->disk)->readStream($image->file_path);
    }

    /**
     * Obtener preview de archivo TIFF convertido a JPEG
     */
    public function getTiffPreview(WorkspaceImage $image)
    {
        try {
            error_log("getTiffPreview llamado para: " . $image->original_name);
            
            if (!Storage::disk($this->disk)->exists($image->file_path)) {
                throw new Exception('Archivo de imagen no encontrado');
            }

            // Generar nombre del archivo de preview
            $previewPath = 'previews/' . pathinfo($image->file_path, PATHINFO_FILENAME) . '_preview.jpg';

            error_log("Buscando preview en: " . $previewPath);

            // Si ya existe el preview, devolverlo
            if (Storage::disk($this->disk)->exists($previewPath)) {
                error_log("Preview encontrado en cache, devolviéndolo");
                return Storage::disk($this->disk)->readStream($previewPath);
            }

            error_log("Preview no encontrado en cache, generando nuevo");

            // Usar el microservicio Python para conversión
            $jpegData = $this->convertWithPythonService($image);
            if ($jpegData) {
                error_log("Conversión exitosa, guardando preview en cache");
                // Guardar el preview convertido
                Storage::disk($this->disk)->put($previewPath, $jpegData);
                return Storage::disk($this->disk)->readStream($previewPath);
            }

            error_log("Conversión con microservicio falló, intentando fallbacks");

            // Fallback: Intentar crear preview usando ImageMagick si está disponible
            if (extension_loaded('imagick')) {
                try {
                    $originalStream = Storage::disk($this->disk)->readStream($image->file_path);
                    $tempFile = tempnam(sys_get_temp_dir(), 'tiff_convert_');
                    file_put_contents($tempFile, stream_get_contents($originalStream));
                    fclose($originalStream);

                    $imagick = new \Imagick($tempFile);
                    $imagick->setImageFormat('jpeg');
                    $imagick->setImageCompressionQuality(85);
                    
                    // Redimensionar si es muy grande
                    if ($imagick->getImageWidth() > 2048 || $imagick->getImageHeight() > 2048) {
                        $imagick->resizeImage(2048, 2048, \Imagick::FILTER_LANCZOS, 1, true);
                    }

                    $jpegData = $imagick->getImageBlob();
                    $imagick->destroy();
                    unlink($tempFile);

                    // Guardar el preview convertido
                    Storage::disk($this->disk)->put($previewPath, $jpegData);
                    
                    return Storage::disk($this->disk)->readStream($previewPath);

                } catch (Exception $e) {
                    // Si falla la conversión, log y continuar
                    error_log("Error converting TIFF to JPEG with ImageMagick: " . $e->getMessage());
                }
            }

            // Intentar con GD como alternativa (limitado pero funcional)
            if (extension_loaded('gd')) {
                try {
                    $originalStream = Storage::disk($this->disk)->readStream($image->file_path);
                    $tempFile = tempnam(sys_get_temp_dir(), 'tiff_convert_');
                    file_put_contents($tempFile, stream_get_contents($originalStream));
                    fclose($originalStream);

                    // GD puede leer algunos TIFFs básicos
                    $gdImage = @imagecreatefromstring(file_get_contents($tempFile));
                    
                    if ($gdImage !== false) {
                        // Redimensionar si es necesario
                        $width = imagesx($gdImage);
                        $height = imagesy($gdImage);
                        
                        if ($width > 2048 || $height > 2048) {
                            $ratio = min(2048 / $width, 2048 / $height);
                            $newWidth = (int)($width * $ratio);
                            $newHeight = (int)($height * $ratio);
                            
                            $resized = imagecreatetruecolor($newWidth, $newHeight);
                            imagecopyresampled($resized, $gdImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                            imagedestroy($gdImage);
                            $gdImage = $resized;
                        }

                        // Convertir a JPEG
                        ob_start();
                        imagejpeg($gdImage, null, 85);
                        $jpegData = ob_get_contents();
                        ob_end_clean();
                        
                        imagedestroy($gdImage);
                        unlink($tempFile);

                        // Guardar el preview convertido
                        Storage::disk($this->disk)->put($previewPath, $jpegData);
                        
                        return Storage::disk($this->disk)->readStream($previewPath);
                    }

                    unlink($tempFile);

                } catch (Exception $e) {
                    error_log("Error converting TIFF to JPEG with GD: " . $e->getMessage());
                }
            }

            // Si no se puede convertir, devolver null para usar original
            return null;

        } catch (Exception $e) {
            error_log("Error in getTiffPreview: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Convertir TIFF usando el microservicio Python
     */
    private function convertWithPythonService(WorkspaceImage $image): ?string
    {
        try {
            // URL del microservicio Python (debe estar corriendo en Docker)
            $pythonServiceUrl = env('PYTHON_SERVICE_URL', 'http://localhost:8001');
            
            error_log("Intentando convertir TIFF con microservicio Python: " . $image->original_name);
            error_log("URL del microservicio: " . $pythonServiceUrl);
            
            // Obtener el archivo TIFF desde MinIO
            $fileStream = Storage::disk($this->disk)->readStream($image->file_path);
            if (!$fileStream) {
                throw new Exception('No se pudo leer el archivo TIFF');
            }

            // Convertir stream a contenido para envío
            $fileContent = stream_get_contents($fileStream);
            fclose($fileStream);

            error_log("Archivo TIFF leído, tamaño: " . strlen($fileContent) . " bytes");

            // Preparar archivo para envío multipart
            $response = Http::timeout(120) // 2 minutos de timeout para archivos grandes
                ->attach('file', $fileContent, $image->original_name)
                ->post($pythonServiceUrl . '/convert-image', [
                    'output_format' => 'JPEG',
                    'quality' => 85,
                    'max_width' => 2048,  // Limitar ancho para optimizar preview
                    'max_height' => 2048  // Limitar alto para optimizar preview
                ]);

            if ($response->successful()) {
                error_log("Conversión exitosa con microservicio Python para: " . $image->original_name);
                error_log("Tamaño de respuesta: " . strlen($response->body()) . " bytes");
                return $response->body();
            } else {
                error_log("Error en microservicio Python: " . $response->status() . " - " . $response->body());
                return null;
            }

        } catch (Exception $e) {
            error_log("Error conectando con microservicio Python: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Formatear bytes a formato legible
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Almacenar imagen procesada en MinIO
     */
    public function storeProcessedImage(
        string $imageContent,
        string $filename,
        string $workspaceId
    ): string {
        try {
            // Generar path para la imagen procesada
            $filePath = "workspaces/{$workspaceId}/processed/{$filename}";

            // Guardar en MinIO
            $stored = Storage::disk($this->disk)->put($filePath, $imageContent);

            if (!$stored) {
                throw new Exception('Failed to store processed image in MinIO');
            }

            return $filePath;

                } catch (Exception $e) {
            Log::error('Error storing processed image: ' . $e->getMessage());
            throw $e;
        }
    }
}

