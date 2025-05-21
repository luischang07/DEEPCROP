<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SentinelController;

Route::post('/search', [SentinelController::class, 'receiveCoordinates']);


Route::post('/searchEngine', [SentinelController::class, 'searchEngine']);

Route::post('/engine/download', [SentinelController::class, 'downloadBand']);
