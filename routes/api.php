<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SatelliteImageController;

Route::get('/test', function () {
    return response()->json(['message' => 'API is working', 'timestamp' => now()]);
});

Route::prefix('satellite')->group(function () {
    Route::post('/search', [SatelliteImageController::class, 'searchImages']);
    Route::post('/download', [SatelliteImageController::class, 'downloadImage']);
    Route::get('/bands', [SatelliteImageController::class, 'getAvailableBands']);
    Route::get('/health', [SatelliteImageController::class, 'healthCheck']);
});
