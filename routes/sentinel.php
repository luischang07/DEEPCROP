<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SentinelController;

Route::post('coordinates', [SentinelController::class, 'receiveCoordinates']);
Route::get('download/{file_name}', [SentinelController::class, 'downloadImage'])
    ->name('download.sentinel');