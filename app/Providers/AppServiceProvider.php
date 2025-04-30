<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Http::macro('insecure', function() {
            return Http::withOptions(['verify' => false]);
        });


        Route::prefix('api/planet')
            ->middleware('api')
            ->group(base_path('routes/planet.php'));

        Route::prefix('api/sentinel')
            ->middleware('api')
            ->group(base_path('routes/sentinel.php'));
    }
}
