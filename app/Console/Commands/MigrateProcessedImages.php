<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\WorkspaceFile;
use App\Models\WorkspaceImage;

class MigrateProcessedImages extends Command
{
    protected $signature = 'images:migrate-processed';
    protected $description = 'Migrate processed images from WorkspaceFile to WorkspaceImage';

    public function handle()
    {
        $this->info('Starting migration of processed images...');

        // Buscar todos los WorkspaceFile que sean processed_image
        $processedFiles = WorkspaceFile::where('file_type', 'processed_image')->get();

        $this->info("Found {$processedFiles->count()} processed images to migrate");

        $migrated = 0;
        $skipped = 0;

        foreach ($processedFiles as $file) {
            // Verificar si ya existe en WorkspaceImage
            $exists = WorkspaceImage::where('file_path', $file->file_path)->exists();
            
            if ($exists) {
                $this->warn("Skipping {$file->name} - already exists in WorkspaceImage");
                $skipped++;
                continue;
            }

            // Crear WorkspaceImage
            $image = new WorkspaceImage();
            $image->workspace_id = $file->workspace_id;
            $image->name = $file->name;
            $image->original_name = $file->original_name;
            $image->file_path = $file->file_path;
            $image->mime_type = $file->mime_type;
            $image->file_size = $file->size;
            $image->is_processed = true;
            $image->metadata = $file->metadata ?? [];
            $image->uploaded_by = $file->uploaded_by;
            $image->created_at = $file->created_at;
            $image->updated_at = $file->updated_at;
            $image->save();

            $this->info("✓ Migrated: {$file->name}");
            $migrated++;
        }

        $this->info("\nMigration complete!");
        $this->info("Migrated: {$migrated}");
        $this->info("Skipped: {$skipped}");

        return 0;
    }
}
