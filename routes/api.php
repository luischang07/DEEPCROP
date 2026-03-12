<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SatelliteImageController;

Route::get('/test', function () {
    return response()->json(['message' => 'API is working', 'timestamp' => now()]);
});

Route::prefix('satellite')->group(function () {
    Route::post('/search', [SatelliteImageController::class, 'searchImages']);
    Route::post('/planet/search', [SatelliteImageController::class, 'searchPlanetImages']);
    Route::post('/planet/order', [SatelliteImageController::class, 'orderPlanetImages']);
    Route::get('/planet/orders', [SatelliteImageController::class, 'getPlanetOrders']);
    Route::get('/planet/orders/{order_id}', [SatelliteImageController::class, 'checkPlanetOrderStatus']);
    Route::post('/download', [SatelliteImageController::class, 'downloadImage']);
    Route::get('/bands', [SatelliteImageController::class, 'getAvailableBands']);
    Route::get('/health', [SatelliteImageController::class, 'healthCheck']);
});
