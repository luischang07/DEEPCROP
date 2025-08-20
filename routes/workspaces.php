<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\WorkspaceFileController;

// Rutas de Workspaces - Con prefijo /api/
Route::prefix('api')->middleware(['auth'])->group(function () {
    
    // Workspaces
    Route::get('/workspaces', [WorkspaceController::class, 'index']); // Listar workspaces del usuario
    Route::post('/workspaces', [WorkspaceController::class, 'store']); // Crear workspace
    Route::get('/workspaces/personal', [WorkspaceController::class, 'personal']); // Espacio personal
    
    Route::prefix('workspaces/{workspace}')->group(function () {
        Route::get('/', [WorkspaceController::class, 'show']); // Detalles del workspace
        Route::put('/', [WorkspaceController::class, 'update'])->middleware('workspace.permission:manage');
        Route::delete('/', [WorkspaceController::class, 'destroy'])->middleware('workspace.permission:delete');
        
        // Gestión de miembros
        Route::post('/invite', [WorkspaceController::class, 'inviteUser'])->middleware('workspace.permission:manage');
        Route::put('/members/{user}/role', [WorkspaceController::class, 'updateUserRole'])->middleware('workspace.permission:manage');
        Route::delete('/members/{user}', [WorkspaceController::class, 'removeUser'])->middleware('workspace.permission:manage');
        
        // Archivos del workspace
        Route::get('/files', [WorkspaceFileController::class, 'index'])->middleware('workspace.permission:read');
        Route::post('/files', [WorkspaceFileController::class, 'store'])->middleware('workspace.permission:write');
        
        Route::prefix('files/{file}')->group(function () {
            Route::get('/', [WorkspaceFileController::class, 'show'])->middleware('workspace.permission:read');
            Route::get('/download', [WorkspaceFileController::class, 'download'])->middleware('workspace.permission:read');
            Route::put('/', [WorkspaceFileController::class, 'update'])->middleware('workspace.permission:write');
            Route::delete('/', [WorkspaceFileController::class, 'destroy'])->middleware('workspace.permission:write');
        });
    });
});
