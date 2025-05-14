<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class SentinelService
{
    private $clientId;
    private $clientSecret;
    protected $baseUrl = 'https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search';

    public function __construct()
    {
        $this->clientId = config('services.sentinelhub.client_id');
        $this->clientSecret = config('services.sentinelhub.client_secret');
    }

    public function getToken(): string
    {
        $response = Http::asForm()->withoutVerifying()->post('https://services.sentinel-hub.com/oauth/token', [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'grant_type' => 'client_credentials'
        ]);

        if ($response->failed()) {
            throw new \Exception('Error al obtener token: ' . $response->body());
        }

        return $response->json()['access_token'];
    }

    public function searchProducts(string $token, array $requestData): array
    {
        $coordinates = $requestData['coordinates'];
        $minLon = min(array_column($coordinates, 0));
        $maxLon = max(array_column($coordinates, 0));
        $minLat = min(array_column($coordinates, 1));
        $maxLat = max(array_column($coordinates, 1));

        // Construct the GeoJSON polygon
        $geometry = [
            "type" => "Polygon",
            "coordinates" => [ $coordinates ]
        ];

        $response = Http::withToken($token)
            ->withoutVerifying()
            ->post($this->baseUrl, [
                "datetime" => $requestData['start_date'] . 'T00:00:00Z/' . $requestData['end_date'] . 'T23:59:59Z',
                "intersects" => $geometry,
                "collections" => ["sentinel-2-l2a"]  //  Añadimos la colección Sentinel-2 L2A
            ]);

        if ($response->failed()) {
            throw new \Exception('Error en la API: ' . $response->status() . ' - ' . $response->body());
        }

        return $response->json();
    }
}