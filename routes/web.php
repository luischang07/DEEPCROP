<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Auth\Events\Login;
use App\Http\Controllers\Admin\AdminController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('/browser', function () {
  return Inertia::render('browser');
})->name('browser');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

// Route::prefix('/admin')->group(function () {
//     Route::match(['get', 'post'], 'login', [AdminController::class, 'login']);
//     Route::group(['middleware' => ['admin']], function () {
//         Route::match(['get', 'post'], 'dashboard', [AdminController::class, 'dashboard']);
//     });
// });


require __DIR__ . '/auth.php';
require __DIR__ . '/settings.php';
