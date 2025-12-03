<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class SatelliteImageController extends Controller
{
  private $satelliteServiceUrl;

  public function __construct()
  {
    $this->satelliteServiceUrl = config('services.satellite.service_url', 'http://localhost:8001');
  }

  /**
   * Buscar imágenes satelitales disponibles
   */
  public function searchImages(Request $request)
  {
    try {
      $request->validate([
        'coordinates' => 'required|array',
        'start_date' => 'required|date',
        'end_date' => 'required|date|after:start_date',
        'max_cloud_cover' => 'nullable|numeric|min:0|max:100',
      ]);

      $coordinates = $request->input('coordinates');

      $bounds = null;
      if (isset($coordinates[0]) && is_array($coordinates[0])) {
        // Verificar si coordinates[0] contiene puntos [lng, lat] directamente
        if (isset($coordinates[0][0]) && is_array($coordinates[0][0]) && count($coordinates[0][0]) === 2 && is_numeric($coordinates[0][0][0])) {
          $bounds = $coordinates[0]; // coordinates[0] contiene el array de puntos
        } else {
          // Estructura más anidada
          $bounds = $coordinates[0][0] ?? $coordinates[0];
        }
      } else {
        $bounds = $coordinates;
      }

      $payload = [
        'bounds' => $bounds,
        'date_start' => $request->input('start_date'),
        'date_end' => $request->input('end_date'),
        'max_cloud_cover' => $request->input('max_cloud_cover', 20),
      ];

      Log::info('Enviando solicitud al microservicio de satélites', [
        'url' => $this->satelliteServiceUrl . '/search',
        'payload' => $payload
      ]);

      $response = Http::timeout(120)
        ->post($this->satelliteServiceUrl . '/search', $payload);

      if (!$response->successful()) {
        Log::error('Error en microservicio de satélites', [
          'status' => $response->status(),
          'body' => $response->body()
        ]);

        return response()->json([
          'error' => 'Error al buscar imágenes satelitales',
          'details' => $response->json()['detail'] ?? 'Error desconocido'
        ], $response->status());
      }

      $results = $response->json();

      return response()->json([
        'success' => true,
        'images' => $results,
        'count' => count($results),
        'search_params' => [
          'start_date' => $request->input('start_date'),
          'end_date' => $request->input('end_date'),
          'coordinates' => $request->input('coordinates'),
          'max_cloud_cover' => $request->input('max_cloud_cover', 100.0)
        ],
        'note' => 'Usa el campo "full_id" para descargar imágenes'
      ]);
    } catch (\Exception $e) {
      Log::error('Error en búsqueda de imágenes satelitales', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
      ]);

      return response()->json([
        'error' => 'Error al buscar imágenes satelitales',
        'details' => $e->getMessage()
      ], 500);
    }
  }

  /**
   * Descargar imagen satelital
   */
  public function downloadImage(Request $request)
  {
    try {
      $request->validate([
        'image_id' => 'required|string',
        'bands' => 'nullable|array',
        'bands.*' => 'string',
        'scale' => 'nullable|numeric|min:1',
        'region' => 'nullable|array',
        'max_file_size_mb' => 'nullable|numeric|min:1|max:100',
        'enhance_visualization' => 'nullable|boolean',
        'visualization_params' => 'nullable|array'
      ]);

      $payload = [
        'image_id' => $request->input('image_id'),
        'bands' => $request->input('bands', ['B4', 'B3', 'B2']),
        'scale' => $request->input('scale', 30.0),
        'region' => $request->input('region'),
        'max_file_size_mb' => $request->input('max_file_size_mb', 45.0),
        'enhance_visualization' => $request->input('enhance_visualization', true),
        'visualization_params' => $request->input('visualization_params')
      ];

      Log::info('Solicitud de descarga al microservicio', [
        'payload' => $payload
      ]);

      $response = Http::timeout(60)
        ->post($this->satelliteServiceUrl . '/download', $payload);

      if (!$response->successful()) {
        Log::error('Error en descarga de microservicio', [
          'status' => $response->status(),
          'body' => $response->body()
        ]);

        return response()->json([
          'error' => 'Error al generar URL de descarga',
          'details' => $response->json()['detail'] ?? 'Error desconocido'
        ], $response->status());
      }

      return response()->json($response->json());
    } catch (\Exception $e) {
      Log::error('Error en descarga de imagen', [
        'error' => $e->getMessage()
      ]);

      return response()->json([
        'error' => 'Error al descargar imagen',
        'details' => $e->getMessage()
      ], 500);
    }
  }

  /**
   * Obtener bandas disponibles
   */
  public function getAvailableBands(Request $request)
  {
    try {
      $collection = $request->query('collection', 'COPERNICUS/S2_SR_HARMONIZED');

      $response = Http::timeout(30)
        ->get($this->satelliteServiceUrl . '/bands/' . urlencode($collection));

      if (!$response->successful()) {
        return response()->json([
          'error' => 'Error al obtener bandas disponibles',
          'details' => $response->json()['detail'] ?? 'Error desconocido'
        ], $response->status());
      }

      return response()->json($response->json());
    } catch (\Exception $e) {
      Log::error('Error obteniendo bandas', [
        'error' => $e->getMessage()
      ]);

      return response()->json([
        'error' => 'Error al obtener bandas',
        'details' => $e->getMessage()
      ], 500);
    }
  }

  /**
   * Health check del microservicio
   */
  public function healthCheck()
  {
    try {
      $response = Http::timeout(10)
        ->get($this->satelliteServiceUrl . '/health');

      return response()->json([
        'satellite_service' => $response->successful() ? 'healthy' : 'unhealthy',
        'status' => $response->status(),
        'data' => $response->json()
      ]);
    } catch (\Exception $e) {
      return response()->json([
        'satellite_service' => 'unreachable',
        'error' => $e->getMessage()
      ], 500);
    }
  }
}
