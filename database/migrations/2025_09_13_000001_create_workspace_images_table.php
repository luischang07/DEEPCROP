<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Para MongoDB, esto es principalmente documentativo ya que MongoDB es schemaless
        Schema::create('workspace_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->onDelete('cascade');
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade');
            $table->string('name'); // Nombre personalizado por el usuario
            $table->string('original_name'); // Nombre original del archivo
            $table->string('file_path'); // Ruta en MinIO
            $table->string('mime_type');
            $table->bigInteger('file_size'); // Tamaño en bytes
            $table->json('metadata')->nullable(); // Metadatos EXIF, etc.
            $table->json('geospatial_bounds')->nullable(); // Límites geoespaciales [min_lat, min_lng, max_lat, max_lng]
            $table->decimal('center_lat', 10, 7)->nullable(); // Latitud del centro
            $table->decimal('center_lng', 10, 7)->nullable(); // Longitud del centro
            $table->boolean('is_processed')->default(false); // Si ya se procesó para extraer metadatos
            $table->text('processing_notes')->nullable(); // Notas del procesamiento
            $table->string('thumbnail_path')->nullable(); // Ruta de thumbnail en MinIO
            $table->json('tags')->nullable(); // Tags opcionales para organización
            $table->timestamps();

            $table->index(['workspace_id', 'uploaded_by']);
            $table->index(['workspace_id', 'created_at']);
            $table->index(['center_lat', 'center_lng']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('workspace_images');
    }
};