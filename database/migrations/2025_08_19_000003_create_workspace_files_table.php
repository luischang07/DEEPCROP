<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('workspace_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->onDelete('cascade');
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->string('original_name');
            $table->string('file_path');
            $table->string('mime_type');
            $table->bigInteger('file_size');
            $table->json('metadata')->nullable(); // Metadatos geoespaciales y EXIF
            $table->json('geospatial_bounds')->nullable(); // Coordenadas límite
            $table->decimal('center_lat', 10, 7)->nullable();
            $table->decimal('center_lng', 10, 7)->nullable();
            $table->boolean('is_processed')->default(false);
            $table->text('processing_notes')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'is_processed']);
            $table->index(['uploaded_by']);
            $table->index(['center_lat', 'center_lng']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('workspace_files');
    }
};
