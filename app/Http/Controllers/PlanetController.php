<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\PlanetService;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Http;

class PlanetController extends Controller
{
    /**
     * Realiza una búsqueda de imágenes satelitales con filtros geoespaciales y temporales
     * 
     * @param Request $request Objeto de solicitud HTTP con parámetros de búsqueda
     * @param PlanetService $planetService Servicio para interactuar con la API de Planet
     * @return \Illuminate\Http\JsonResponse Respuesta JSON con resultados o errores
     */
    public function search(Request $request, PlanetService $planetService)
    {
        try {
            $validated = $this->validateSearchRequest($request);
            $results = $planetService->quickSearch($validated);

            return $this->buildSearchSuccessResponse($results);

        } catch (ValidationException $e) {
            return $this->buildValidationErrorResponse($e);
        } catch (\Exception $e) {
            Log::error('Search error: '.$e->getMessage());
            return $this->buildErrorResponse('Search failed', $e);
        }
    }

    /**
     * Obtiene los assets disponibles para un item específico
     * 
     * @param string $id ID del item
     * @param PlanetService $planetService Servicio para interactuar con la API de Planet
     * @return \Illuminate\Http\JsonResponse Respuesta JSON con assets o errores
     */
    public function getAssets(string $id, PlanetService $planetService)
    {
        try {
            $assets = $planetService->getAssetLinks($id);
            return $this->buildAssetsResponse($assets);

        } catch (\Exception $e) {
            Log::error("Get assets failed for {$id}: ".$e->getMessage());
            return $this->buildErrorResponse('Get assets failed', $e);
        }
    }

    /**
     * Activa el asset basic_analytic_4b para su descarga
     * 
     * @param string $id ID del item a activar
     * @param PlanetService $planetService Servicio para interactuar con la API de Planet
     * @return \Illuminate\Http\JsonResponse Respuesta JSON con estado del asset o errores
     */
    public function activateAsset(string $id, PlanetService $planetService)
    {
        try {
            $assets = $planetService->activateBasicAnalyticAsset($id);
            $basicAnalytic = $assets['basic_analytic_4b'] ?? null;

            $statusResult = $this->checkAssetStatus($basicAnalytic);
            return $this->buildActivationResponse($statusResult);

        } catch (\Exception $e) {
            Log::error("Activation failed for {$id}: ".$e->getMessage());
            return $this->buildErrorResponse('Activation failed', $e);
        }
    }

    /**
     * Valida los parámetros de búsqueda del request
     */
    private function validateSearchRequest(Request $request): array
    {
        return $request->validate([
            'geometry' => 'required|array',
            'geometry.type' => 'required|string|in:Polygon',
            'geometry.coordinates' => 'required|array',
            'date_range.start' => 'required|date_format:Y-m-d',
            'date_range.end' => 'required|date_format:Y-m-d|after_or_equal:date_range.start',
            'max_cloud_cover' => 'sometimes|numeric|min:0|max:100'
        ]);
    }

    /**
     * Construye respuesta JSON exitosa para búsqueda
     */
    private function buildSearchSuccessResponse(array $results): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'status_code' => 200,
            'features' => $results,
            'image_ids' => array_column($results, 'id'),
            'count' => count($results)
        ]);
    }

    /**
     * Construye respuesta JSON para assets
     */
    private function buildAssetsResponse(array $assets): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'status_code' => 200,
            'assets' => $assets,
            'basic_analytic_status' => $assets['basic_analytic_4b']['status'] ?? null,
            'activation_link' => $assets['basic_analytic_4b']['_links']['activate'] ?? null
        ]);
    }

    /**
     * Verifica el estado de un asset después de la activación
     */
    private function checkAssetStatus(?array $basicAnalytic): array
    {
        if (!$basicAnalytic) {
            throw new \Exception("El asset 'basic_analytic_4b' no está disponible.");
        }

        return $this->makeRequest('get', $basicAnalytic['_links']['_self']);
    }

    /**
     * Construye respuesta JSON para activación de asset
     */
    private function buildActivationResponse(array $statusResult): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'status_code' => 200,
            'status' => $statusResult['status'],
            'download_url' => $statusResult['location'] ?? null,
            'message' => $statusResult['status'] === 'active' 
                ? 'Asset ready for download' 
                : 'Asset is activating, check again later'
        ]);
    }

    /**
     * Construye respuesta JSON para error de validación
     */
    private function buildValidationErrorResponse(ValidationException $e): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'status_code' => 422,
            'error' => 'Validation error',
            'messages' => $e->errors()
        ], 422);
    }

    /**
     * Construye respuesta JSON genérica para errores
     */
    private function buildErrorResponse(string $error, \Exception $e): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'status_code' => 500,
            'error' => $error,
            'message' => $e->getMessage()
        ], 500);
    }

    /**
     * Realiza una petición HTTP autenticada a la API de Planet
     * 
     * @param string $method Método HTTP (get, post, etc.)
     * @param string $url URL completa del endpoint
     * @param array $data Datos a enviar en la petición
     * @return array Respuesta de la API
     * @throws \Exception Si la petición falla
     */
    protected function makeRequest(string $method, string $url, array $data = []): array
    {
        $response = Http::withOptions(['verify' => false])
            ->withBasicAuth(env('PLANET_API_KEY'), '')
            ->{$method}($url, $data);
    
        if ($response->failed()) {
            throw new \Exception("Request failed: {$response->status()} - {$response->body()}");
        }
    
        // Asegurar que siempre retorne un array, incluso si la respuesta es vacía
        return $response->json() ?? [];
    }
}