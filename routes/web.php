<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AreaExportController;
use Illuminate\Support\Facades\Auth;

Route::get('/', function () {
  if (Auth::check()) {
    return redirect()->route('dashboard');
  }

  return Inertia::render('auth/login');
})->name('home');

Route::get('/browser', function () {
  return Inertia::render('browser');
})->name('browser');

Route::middleware(['auth', 'verified'])->group(function () {
  Route::get('/test-image-conversion', function () {
    try {
      // Simular conversión de una imagen de prueba
      $response = \Illuminate\Support\Facades\Http::timeout(60)
        ->attach('file', file_get_contents(public_path('test_map_with_metadata.tiff')), 'test.tiff')
        ->post('http://localhost:8001/convert-image', [
          'output_format' => 'JPEG',
          'quality' => 85,
          'max_width' => 1024,
          'max_height' => 1024
        ]);

      if ($response->successful()) {
        return response($response->body(), 200, [
          'Content-Type' => 'image/jpeg',
          'Content-Disposition' => 'inline; filename="test_converted.jpg"',
          'Cache-Control' => 'public, max-age=3600',
        ]);
      } else {
        return response()->json([
          'error' => 'Conversion failed',
          'status' => $response->status(),
          'body' => $response->body()
        ]);
      }
    } catch (Exception $e) {
      return response()->json([
        'error' => $e->getMessage()
      ]);
    }
  });

  Route::get('/dashboard', function () {
    return Inertia::render('dashboard');
  })->name('dashboard');

  Route::get('procesar-imagenes', function () {
    $user = auth()->user();

    // Get workspace IDs where user is a member
    $workspaceUsers = \App\Models\WorkspaceUser::where('user_id', $user->_id)
      ->pluck('workspace_id')
      ->toArray();

    // Get workspaces created by user or where user is a member
    $workspaces = \App\Models\Workspace::where(function ($query) use ($user, $workspaceUsers) {
      $query->where('created_by', $user->_id)
        ->orWhereIn('_id', $workspaceUsers);
    })
      ->get(['_id', 'name'])
      ->map(function ($workspace) {
        return [
          '_id' => (string) $workspace->_id,
          'name' => $workspace->name
        ];
      });

    return Inertia::render('procesar-imagenes', [
      'workspaces' => $workspaces
    ]);
  })->name('procesar-imagenes');

  Route::get('espacios-trabajo', function () {
    return Inertia::render('espacios-trabajo');
  })->name('espacios-trabajo');

  Route::get('satellite-images', function () {
    return Inertia::render('SatelliteImages');
  })->name('satellite-images');

  Route::get('procesar-imagenes', function () {
    return Inertia::render('procesar-imagenes');
  })->name('procesar-imagenes');

  Route::get('espacios-trabajo', function () {
    return Inertia::render('espacios-trabajo');
  })->name('espacios-trabajo');

  Route::get('satellite-images', function () {
    return Inertia::render('SatelliteImages');
  })->name('satellite-images');

  // Página dedicada para imágenes de workspace
  Route::get('workspaces/{workspace}/images', function ($workspaceId) {
    return Inertia::render('workspace-images', [
      'workspaceId' => $workspaceId
    ]);
  })->name('workspace.images');

  Route::post('/api/export-area', [AreaExportController::class, 'exportArea'])->name('api.export-area');

  // AI Model Module
  Route::get('/ai-model', [App\Http\Controllers\AIModelController::class, 'index'])->name('ai-model');
  Route::get('/api/ai/models', [App\Http\Controllers\AIModelController::class, 'models']);
  Route::post('/api/ai/predict', [App\Http\Controllers\AIModelController::class, 'predict']);
  Route::get('/api/ai/status/{jobId}', [App\Http\Controllers\AIModelController::class, 'status']);
  Route::post('/api/ai/train', [App\Http\Controllers\AIModelController::class, 'train']);
  Route::post('/api/ai/upload', [App\Http\Controllers\AIModelController::class, 'uploadModel']);
  Route::get('/api/ai/training/status/{jobId}', [App\Http\Controllers\AIModelController::class, 'trainingStatus']);
});

// Incluir rutas de API para workspaces
require __DIR__ . '/workspaces.php';

// Incluir rutas de procesamiento de imágenes
require __DIR__ . '/image-processor.php';

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
