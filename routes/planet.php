<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PlanetController;

// routes/api.php
Route::post('/search', [PlanetController::class, 'search']);

// Obtener assets de un item específico
Route::get('/items/{id}/assets', [PlanetController::class, 'getAssets']);

// Activar un asset específico
Route::post('/items/{id}/activate', [PlanetController::class, 'activateAsset']);
Route::get('/items/{id}/check-activation', [PlanetController::class, 'checkActivation']);