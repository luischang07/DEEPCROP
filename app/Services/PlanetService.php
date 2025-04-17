<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;
use RuntimeException;

class PlanetService
{
    // Configuración base de la API
    protected string $baseUrl = 'https://api.planet.com/data/v1';
    protected ?string $apiKey;
    protected int $timeout = 30;
    protected int $retryAttempts = 3;
    protected int $retryDelay = 100;
    protected string $itemType = 'PSScene';

    /**
     * Constructor que carga la clave API desde variables de entorno.
     * @throws RuntimeException Si la clave API no está configurada
     */
    public function __construct()
    {
        $this->loadApiKeyFromEnv();
        
        if (empty($this->apiKey)) {
            throw new RuntimeException('Planet API key is not configured');
        }
    }

    /**
     * Realiza una búsqueda rápida en la API de Planet.
     * @param array $filter Filtros de búsqueda
     * @return array Resultados de la búsqueda
     * @throws Exception Si la búsqueda falla
     */
    public function quickSearch(array $filter): array
    {
        try {
            $requestBody = [
                'item_types' => [$this->itemType],
                'filter' => $this->buildFilter($filter)
            ];

            $response = $this->makeRequest('post', 'quick-search', $requestBody);
            return $response['features'] ?? [];

        } catch (Exception $e) {
            Log::error('Search failed: '.$e->getMessage());
            throw $e;
        }
    }

    /**
     * Obtiene los enlaces de assets para un item específico.
     * @param string $itemId ID del item
     * @return array Información de los assets
     * @throws Exception Si la solicitud falla
     */
    public function getAssetLinks(string $itemId): array
    {
        try {
            $endpoint = "item-types/{$this->itemType}/items/{$itemId}/assets";
            return $this->makeRequest('get', $endpoint);

        } catch (Exception $e) {
            Log::error("Failed to get assets for {$itemId}: ".$e->getMessage());
            throw $e;
        }
    }

    /**
     * Activa el asset basic_analytic_4b para un item específico.
     * @param string $itemId ID del item
     * @return array Estado actualizado de los assets
     * @throws RuntimeException Si el asset no está disponible
     */
    public function activateBasicAnalyticAsset(string $itemId): array
    {
        try {
            $assets = $this->getAssetLinks($itemId);
            
            if (!isset($assets['basic_analytic_4b'])) {
                throw new RuntimeException('basic_analytic_4b asset not available for this item');
            }

            $this->activateAssetIfInactive($assets['basic_analytic_4b']);
            
            return $this->getAssetLinks($itemId);

        } catch (Exception $e) {
            Log::error("Failed to activate basic_analytic_4b asset for item {$itemId}: ".$e->getMessage());
            throw $e;
        }
    }

    /**
     * Carga la clave API desde variables de entorno.
     */
    private function loadApiKeyFromEnv(): void
    {
        $dotenv = \Dotenv\Dotenv::createImmutable(app()->environmentPath());
        $dotenv->load();
        $this->apiKey = $_ENV['PLANET_API_KEY'] ?? null;
    }

    /**
     * Activa un asset si está inactivo.
     */
    private function activateAssetIfInactive(array $asset): void
    {
        if ($asset['status'] === 'inactive') {
            $activationUrl = $asset['_links']['activate'];
            $this->makeAuthenticatedPost($activationUrl);
            usleep(500000); // Espera 500ms para que el servidor procese la activación
        }
    }

    /**
     * Construye el filtro para la búsqueda.
     */
    protected function buildFilter(array $filter): array
    {
        $filters = [
            $this->createGeometryFilter($filter['geometry']),
            $this->createDateRangeFilter($filter['date_range'])
        ];

        if (isset($filter['max_cloud_cover'])) {
            $filters[] = $this->createCloudCoverFilter($filter['max_cloud_cover']);
        }

        return ['type' => 'AndFilter', 'config' => $filters];
    }

    /**
     * Crea filtro de geometría.
     */
    private function createGeometryFilter(array $geometry): array
    {
        return [
            'type' => 'GeometryFilter',
            'field_name' => 'geometry',
            'config' => $geometry
        ];
    }

    /**
     * Crea filtro de rango de fechas.
     */
    private function createDateRangeFilter(array $dateRange): array
    {
        return [
            'type' => 'DateRangeFilter',
            'field_name' => 'acquired',
            'config' => [
                'gte' => "{$dateRange['start']}T00:00:00Z",
                'lte' => "{$dateRange['end']}T23:59:59Z"
            ]
        ];
    }

    /**
     * Crea filtro de cobertura de nubes.
     */
    private function createCloudCoverFilter(float $maxCloudCover): array
    {
        return [
            'type' => 'RangeFilter',
            'field_name' => 'cloud_cover',
            'config' => [
                'lte' => $maxCloudCover
            ]
        ];
    }

    /**
     * Realiza una petición autenticada POST a una URL completa.
     */
    protected function makeAuthenticatedPost(string $fullUrl): ?array
    {
        $response = Http::withOptions(['verify' => false])
            ->withBasicAuth($this->apiKey, '')
            ->timeout($this->timeout)
            ->retry($this->retryAttempts, $this->retryDelay)
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json'
            ])
            ->post($fullUrl);
    
        if ($response->failed()) {
            throw new RuntimeException("API request failed: {$response->status()} - {$response->body()}");
        }
    
        // Permitir respuesta nula para activación
        return $response->json() ?? [];
    }

    /**
     * Realiza una petición a la API de Planet.
     */
    protected function makeRequest(string $method, string $endpoint, array $data = []): ?array
    {
        $url = "{$this->baseUrl}/{$endpoint}";
        return $this->makeHttpRequest($method, $url, $data);
    }

    /**
     * Método genérico para realizar peticiones HTTP.
     */
    private function makeHttpRequest(string $method, string $url, array $data = []): array
    {
        $response = Http::withOptions(['verify' => false]) // SSL verification disabled
            ->withBasicAuth($this->apiKey, '')
            ->timeout($this->timeout)
            ->retry($this->retryAttempts, $this->retryDelay)
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json'
            ])
            ->{$method}($url, $data);

        if ($response->failed()) {
            throw new RuntimeException("API request failed: {$response->status()} - {$response->body()}");
        }

        return $response->json();
    }
}