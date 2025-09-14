<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Exception;

class InitializeMinioStorage extends Command
{
    protected $signature = 'minio:init {--bucket=deepcrop-images : Nombre del bucket a crear}';
    protected $description = 'Inicializar MinIO storage creando los buckets necesarios';

    public function handle()
    {
        $bucketName = $this->option('bucket');
        
        try {
            $this->info("Inicializando MinIO storage...");
            
            // Verificar conexión con MinIO
            $disk = Storage::disk('minio');
            
            // Intentar crear el bucket si no existe
            if (!$this->bucketExists($disk, $bucketName)) {
                $this->info("Creando bucket: {$bucketName}");
                $this->createBucket($disk, $bucketName);
                $this->info("Bucket {$bucketName} creado exitosamente.");
            } else {
                $this->info("El bucket {$bucketName} ya existe.");
            }
            
            // Crear estructura de directorios base
            $this->createDirectoryStructure($disk);
            
            $this->info("✅ MinIO storage inicializado correctamente.");
            $this->newLine();
            $this->info("Puedes acceder al panel de MinIO en: http://localhost:9001");
            $this->info("Usuario: deepcrop_minio_user");
            $this->info("Contraseña: deepcrop_minio_password123");
            
        } catch (Exception $e) {
            $this->error("Error al inicializar MinIO: " . $e->getMessage());
            $this->newLine();
            $this->info("Asegúrate de que:");
            $this->info("1. El contenedor de MinIO esté ejecutándose");
            $this->info("2. Las variables de entorno estén configuradas correctamente");
            $this->info("3. El bucket {$bucketName} exista o pueda ser creado");
            
            return 1;
        }
        
        return 0;
    }
    
    private function bucketExists($disk, $bucketName): bool
    {
        try {
            // Intentar listar archivos del bucket
            $disk->files('');
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    private function createBucket($disk, $bucketName): void
    {
        // Para MinIO con S3, el bucket se crea automáticamente al subir un archivo
        // Creamos un archivo temporal para forzar la creación del bucket
        $disk->put('.gitkeep', '');
        $disk->delete('.gitkeep');
    }
    
    private function createDirectoryStructure($disk): void
    {
        $directories = [
            'images/personal/.gitkeep',
            'images/shared/.gitkeep',
            'thumbnails/personal/.gitkeep',
            'thumbnails/shared/.gitkeep',
        ];
        
        foreach ($directories as $path) {
            try {
                $disk->put($path, '');
                $this->line("  ✓ Creado: {$path}");
            } catch (Exception $e) {
                $this->warn("  ⚠ No se pudo crear: {$path} - " . $e->getMessage());
            }
        }
    }
}