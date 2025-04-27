<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PlanetController;

Route::get('/hola', function () {
    return response()->json(['message' => 'hola desde api general']);
});