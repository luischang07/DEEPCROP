<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SentinelController;

Route::post('/search', [SentinelController::class, 'receiveCoordinates']);

Route::post('coordinates', [SentinelController::class, 'coordinatesForDownload']);

Route::get('download/{file_name}', [SentinelController::class, 'downloadImage'])
    ->name('download.sentinel');

//crear enpoint para descargar la imagen y retornarla al frontend