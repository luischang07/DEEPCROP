<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class WorkspaceFile extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'workspace_files';

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
    ];

    protected $casts = [
        'metadata' => 'array',
        'geospatial_bounds' => 'array',
        'center_lat' => 'float',
        'center_lng' => 'float',
        'is_processed' => 'boolean',
        'file_size' => 'integer',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getFileUrl(): string
    {
        return Storage::url($this->file_path);
    }

    public function getFileSizeFormatted(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    public function isTiff(): bool
    {
        return in_array($this->mime_type, [
            'image/tiff',
            'image/tif',
            'application/x-tiff'
        ]);
    }

    public function hasGeospatialData(): bool
    {
        return !is_null($this->center_lat) && !is_null($this->center_lng);
    }

    public function getCoordinatesArray(): ?array
    {
        if (!$this->hasGeospatialData()) {
            return null;
        }

        if ($this->geospatial_bounds && is_array($this->geospatial_bounds)) {
            return $this->geospatial_bounds;
        }

        return [
            'center' => [
                'lat' => (float) $this->center_lat,
                'lng' => (float) $this->center_lng,
            ]
        ];
    }
}
