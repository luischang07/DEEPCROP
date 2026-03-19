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

// AI Model Module - Session-based API routes
Route::middleware(['web', 'auth'])->prefix('ai')->group(function () {
    Route::get('/models', [App\Http\Controllers\AIModelController::class, 'models']);
    Route::post('/predict', [App\Http\Controllers\AIModelController::class, 'predict']);
    Route::get('/status/{jobId}', [App\Http\Controllers\AIModelController::class, 'status']);
    Route::get('/preview/{jobId}', [App\Http\Controllers\AIModelController::class, 'preview']);
    Route::post('/train', [App\Http\Controllers\AIModelController::class, 'train']);
    Route::post('/upload', [App\Http\Controllers\AIModelController::class, 'uploadModel']);
    Route::get('/training/status/{jobId}', [App\Http\Controllers\AIModelController::class, 'trainingStatus']);
    Route::delete('/training/cancel/{jobId}', [App\Http\Controllers\AIModelController::class, 'cancelTraining']);
    Route::post('/training/upload-dataset', [App\Http\Controllers\AIModelController::class, 'uploadTrainingDataset']);
    Route::post('/unsupervised/train', [App\Http\Controllers\AIModelController::class, 'unsupervisedTrain']);
    Route::get('/unsupervised/status/{jobId}', [App\Http\Controllers\AIModelController::class, 'unsupervisedTrainingStatus']);
    Route::delete('/unsupervised/cancel/{jobId}', [App\Http\Controllers\AIModelController::class, 'cancelUnsupervisedTraining']);
    Route::get('/inferences', [App\Http\Controllers\AIModelController::class, 'listInferences']);
    Route::delete('/inference/{jobId}', [App\Http\Controllers\AIModelController::class, 'deleteInference']);
});
