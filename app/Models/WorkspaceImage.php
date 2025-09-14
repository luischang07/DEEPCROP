<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class WorkspaceImage extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'workspace_images';

    protected $fillable = [
        'workspace_id',
        'uploaded_by',
        'name',
        'original_name',
        'file_path',
        'mime_type',
        'file_size',
        'metadata',
        'geospatial_bounds',
        'center_lat',
        'center_lng',
        'is_processed',
        'processing_notes',
        'thumbnail_path',
        'tags',
    ];

    protected $casts = [
        'metadata' => 'array',
        'geospatial_bounds' => 'array',
        'center_lat' => 'float',
        'center_lng' => 'float',
        'is_processed' => 'boolean',
        'file_size' => 'integer',
        'tags' => 'array',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Obtener URL temporal para descargar la imagen desde MinIO
     */
    public function getTemporaryUrl(int $minutes = 60): string
    {
        return Storage::disk('minio')->temporaryUrl(
            $this->file_path,
            now()->addMinutes($minutes)
        );
    }

    /**
     * Obtener URL temporal para el thumbnail
     */
    public function getThumbnailUrl(int $minutes = 60): ?string
    {
        if (!$this->thumbnail_path) {
            return null;
        }

        return Storage::disk('minio')->temporaryUrl(
            $this->thumbnail_path,
            now()->addMinutes($minutes)
        );
    }

    /**
     * Verificar si el usuario tiene permisos para ver esta imagen
     */
    public function canView(User $user): bool
    {
        return $this->workspace->hasPermission($user, 'read');
    }

    /**
     * Verificar si el usuario tiene permisos para editar esta imagen
     */
    public function canEdit(User $user): bool
    {
        // El propietario de la imagen siempre puede editarla
        if ($this->uploaded_by === $user->_id) {
            return true;
        }
        
        // Usuarios con permisos de write en el workspace pueden editar imágenes
        return $this->workspace->hasPermission($user, 'write');
    }

    /**
     * Verificar si el usuario puede eliminar esta imagen
     */
    public function canDelete(User $user): bool
    {
        // El propietario de la imagen siempre puede eliminarla
        if ($this->uploaded_by === $user->_id) {
            return true;
        }
        
        // Usuarios con permisos de delete en el workspace pueden eliminar imágenes
        return $this->workspace->hasPermission($user, 'delete');
    }

    /**
     * Obtener tamaño formateado del archivo
     */
    public function getFileSizeFormatted(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Verificar si es una imagen TIFF/GeoTIFF
     */
    public function isTiff(): bool
    {
        return in_array($this->mime_type, [
            'image/tiff',
            'image/tif',
            'application/x-tiff'
        ]);
    }

    /**
     * Verificar si es una imagen satelital común
     */
    public function isSatelliteImage(): bool
    {
        return $this->isTiff() || in_array($this->mime_type, [
            'image/jpeg',
            'image/png',
            'image/jp2', // JPEG 2000
            'application/octet-stream' // Algunos formatos especializados
        ]);
    }

    /**
     * Verificar si tiene datos geoespaciales
     */
    public function hasGeospatialData(): bool
    {
        return !is_null($this->center_lat) && !is_null($this->center_lng);
    }

    /**
     * Obtener coordenadas como array
     */
    public function getCoordinatesArray(): ?array
    {
        if (!$this->hasGeospatialData()) {
            return null;
        }

        $result = [
            'center' => [
                'lat' => (float) $this->center_lat,
                'lng' => (float) $this->center_lng,
            ]
        ];

        if ($this->geospatial_bounds && is_array($this->geospatial_bounds)) {
            $result['bounds'] = $this->geospatial_bounds;
        }

        return $result;
    }

    /**
     * Agregar/actualizar tags
     */
    public function addTags(array $tags): void
    {
        $currentTags = $this->tags ?? [];
        $this->tags = array_unique(array_merge($currentTags, $tags));
        $this->save();
    }

    /**
     * Eliminar tags
     */
    public function removeTags(array $tags): void
    {
        $currentTags = $this->tags ?? [];
        $this->tags = array_diff($currentTags, $tags);
        $this->save();
    }

    /**
     * Boot method para eventos del modelo
     */
    protected static function boot()
    {
        parent::boot();

        // Al eliminar la imagen, eliminar también los archivos de MinIO
        static::deleting(function ($image) {
            try {
                // Eliminar imagen principal
                if (Storage::disk('minio')->exists($image->file_path)) {
                    Storage::disk('minio')->delete($image->file_path);
                }

                // Eliminar thumbnail si existe
                if ($image->thumbnail_path && Storage::disk('minio')->exists($image->thumbnail_path)) {
                    Storage::disk('minio')->delete($image->thumbnail_path);
                }
            } catch (\Exception $e) {
                \Log::error('Error deleting image files from MinIO: ' . $e->getMessage());
            }
        });
    }
}