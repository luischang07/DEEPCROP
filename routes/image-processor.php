<?php

use App\Http\Controllers\ImageProcessorController;
use Illuminate\Support\Facades\Route;

// Rutas de procesamiento de imágenes satelitales
Route::middleware(['auth'])->prefix('image-processor')->name('image-processor.')->group(function () {
    
    // Health check del servicio de procesamiento
    Route::get('/health', [ImageProcessorController::class, 'healthCheck'])
        ->name('health');
    
    // Obtener índices disponibles
    Route::get('/indices', [ImageProcessorController::class, 'getAvailableIndices'])
        ->name('indices');
    
    // Procesar imagen
    Route::post('/process', [ImageProcessorController::class, 'processImage'])
        ->name('process');
});
