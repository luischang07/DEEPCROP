<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AreaExportController;

Route::get('/', function () {
    return Inertia::render('auth/login');
})->name('home');

Route::get('/browser', function () {
  return Inertia::render('browser');
})->name('browser');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    
    Route::get('procesar-imagenes', function () {
        return Inertia::render('procesar-imagenes');
    })->name('procesar-imagenes');
    
    Route::get('espacios-trabajo', function () {
        return Inertia::render('espacios-trabajo');
    })->name('espacios-trabajo');
    
    Route::post('/api/export-area', [AreaExportController::class, 'exportArea'])->name('api.export-area');
});

// Incluir rutas de API para workspaces
require __DIR__.'/workspaces.php';

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
