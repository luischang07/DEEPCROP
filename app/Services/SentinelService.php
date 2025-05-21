<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class SentinelService
{
    private $clientId;
    private $clientSecret;
    protected $baseUrl = 'https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search';

    public function __construct()
    {
        $this->clientId = config('services.sentinelhub.client_id');
        $this->clientSecret = config('services.sentinelhub.client_secret');
        $this->ensureDirectoriesExist();
    }

    private function ensureDirectoriesExist()
    {
        if (!Storage::exists('sentinel/images')) {
            Storage::makeDirectory('sentinel/images', 0755, true);
        }
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

    public function fetchImage(string $token, array $requestData): string
    {
        $coordinates = $requestData['coordinates'];
        $minLon = min(array_column($coordinates, 0));
        $maxLon = max(array_column($coordinates, 0));
        $minLat = min(array_column($coordinates, 1));
        $maxLat = max(array_column($coordinates, 1));

        $response = Http::withToken($token)
            ->withoutVerifying()
            ->timeout(120)
            ->post('https://services.sentinel-hub.com/api/v1/process', [
                "input" => [
                    "bounds" => [
                        "bbox" => [$minLon, $minLat, $maxLon, $maxLat],
                        "properties" => ["crs" => "http://www.opengis.net/def/crs/OGC/1.3/CRS84"]
                    ],
                    "data" => [[
                        "type" => "sentinel-2-l2a",
                        "dataFilter" => [
                            "timeRange" => [
                                "from" => $requestData['start_date'] . 'T00:00:00Z',
                                "to" => $requestData['end_date'] . 'T23:59:59Z'
                            ],
                            "mosaickingOrder" => "leastCC"
                        ]
                    ]]
                ],
                "output" => [
                    "width" => 100,
                    "height" => 100,
                    "responses" => [[
                        "identifier" => "default",
                        "format" => ["type" => "image/tiff"]
                    ]]
                ],
                "evalscript" => $this->generateEvalScript($requestData['sampleType'])
            ]);

        error_log($requestData['id']);
        if ($response->failed()) {
            throw new \Exception('Error en la API: ' . $response->status() . ' - ' . $response->body());
        }

        return $response->body();
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
    private function generateEvalScript(string $sampleType): string
    {
        return <<<EOL
//VERSION=3
function setup() {
    return {
        input: ["B04", "B08"],
        output: { 
            bands: 2,
            sampleType: "$sampleType"
        }
    };
}

function evaluatePixel(sample) {
    return [sample.B04, sample.B08];
}
EOL;
    }
}