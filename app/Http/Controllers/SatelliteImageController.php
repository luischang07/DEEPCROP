<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Models\PlanetOrder;

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

      $bounds = $coordinates;

      // Mientras $bounds sea un array y su primer elemento sea otro array que a su vez contiene un array, desanidamos.
      // Queremos parar cuando $bounds[0] sea [lng, lat], es decir, un array de números.
      while (is_array($bounds) && isset($bounds[0]) && is_array($bounds[0]) && isset($bounds[0][0]) && is_array($bounds[0][0])) {
          $bounds = $bounds[0];
      }

      // Verificamos por seguridad si sigue estando mal formado (por si mandan un solo punto [lng, lat])
      if (is_array($bounds) && isset($bounds[0]) && is_numeric($bounds[0])) {
          $bounds = [$bounds]; // Convertimos [lng, lat] individual a [[lng, lat]]
      }

      $payload = [
        'bounds' => $bounds,
        'date_start' => $request->input('start_date'),
        'date_end' => $request->input('end_date'),
        'max_cloud_cover' => $request->input('max_cloud_cover', 20),
      ];
      
      if ($request->has('collection')) {
        $payload['collection'] = $request->input('collection');
      }

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

      $imageId = $request->input('image_id');
      $defaultScale = 30.0;
      
      // Ajustar escala por defecto según el satélite
      if (str_contains($imageId, 'COPERNICUS/S2')) {
          $defaultScale = 10.0;
      } elseif (str_contains($imageId, 'LANDSAT')) {
          $defaultScale = 15.0; // Reducido de 30m a 15m para mayor suavidad (interpolación)
      }

      $payload = [
        'image_id' => $imageId,
        'bands' => $request->input('bands', ['B4', 'B3', 'B2']),
        'scale' => $request->input('scale', $defaultScale),
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
   * Buscar imágenes en Planet Scope
   */
  public function searchPlanetImages(Request $request)
  {
    try {
      $request->validate([
        'coordinates' => 'required|array',
        'start_date' => 'required|date',
        'end_date' => 'required|date|after:start_date',
        'max_cloud_cover' => 'nullable|numeric|min:0|max:100',
      ]);

      $payload = [
        'geometry' => $request->input('coordinates'),
        'date_start' => $request->input('start_date'),
        'date_end' => $request->input('end_date'),
        'max_cloud_cover' => $request->input('max_cloud_cover', 20.0),
        'api_key' => env('PLANET_API_KEY')
      ];

      $response = Http::timeout(120)
        ->post($this->satelliteServiceUrl . '/planet/search', $payload);

      if (!$response->successful()) {
        return response()->json($response->json(), $response->status());
      }

      return response()->json($response->json());
    } catch (\Exception $e) {
      return response()->json(['error' => $e->getMessage()], 500);
    }
  }

  /**
   * Crear una orden en Planet Scope
   */
  public function orderPlanetImages(Request $request)
  {
    try {
      $request->validate([
        'name' => 'required|string',
        'item_ids' => 'required|array',
        'coordinates' => 'nullable|array'
      ]);

      $payload = [
        'name' => $request->input('name'),
        'item_ids' => $request->input('item_ids'),
        'bundle' => $request->input('bundle', 'analytic_8b_sr_udm2'),
        'api_key' => env('PLANET_API_KEY')
      ];

      if ($request->has('coordinates')) {
        $payload['geometry'] = $request->input('coordinates');
      }

      $response = Http::timeout(120)
        ->post($this->satelliteServiceUrl . '/planet/order', $payload);

      if (!$response->successful()) {
        return response()->json($response->json(), $response->status());
      }

      $data = $response->json();
      
      // Guardar la orden en la base de datos
      if (isset($data['id'])) {
          PlanetOrder::create([
              'order_id' => $data['id'],
              'name' => $payload['name'],
              'status' => $data['state'] ?? 'queued',
              'metadata' => [
                  'item_ids' => $payload['item_ids'],
                  'coordinates' => $request->input('coordinates')
              ]
          ]);
      }

      return response()->json($data);
    } catch (\Exception $e) {
      return response()->json(['error' => $e->getMessage()], 500);
    }
  }

  /**
   * Listar pedidos guardados
   */
  public function getPlanetOrders()
  {
      $orders = PlanetOrder::orderBy('created_at', 'desc')->get();
      return response()->json($orders);
  }

  /**
   * Revisar el estado actual de una orden y guardar si finalizó
   */
  public function checkPlanetOrderStatus($order_id)
  {
      try {
          $order = PlanetOrder::where('order_id', $order_id)->firstOrFail();

          /* 
          // Comentado para permitir refrescar URLs con la nueva lógica incluso si ya es 'success'
          if ($order->status === 'success' || $order->status === 'failed') {
              return response()->json($order);
          }
          */

          $response = Http::timeout(30)->get($this->satelliteServiceUrl . '/planet/order/' . $order_id, [
              'api_key' => env('PLANET_API_KEY')
          ]);

          if ($response->successful()) {
              $data = $response->json();
              $order->status = $data['state'] ?? $order->status;
              
              if ($order->status === 'success' && isset($data['_links']['results'])) {
                  $results = $data['_links']['results'];
                  $best_url = null;
                  $highest_priority = -1;

                  foreach ($results as $result) {
                      $name = $result['name'] ?? '';
                      $current_priority = 0;

                      if (str_ends_with($name, '.zip')) {
                          $current_priority = 10;
                      } elseif (str_ends_with($name, '.tif') || str_ends_with($name, '.tiff')) {
                          $current_priority = 5;
                          // Priorizar imágenes analíticas sobre máscaras
                          if (str_contains($name, 'AnalyticMS') || str_contains($name, 'ortho')) {
                              $current_priority = 8;
                          }
                      } elseif (str_ends_with($name, '.json') || str_ends_with($name, '.xml')) {
                          $current_priority = 1;
                      }

                      if ($current_priority > $highest_priority) {
                          $highest_priority = $current_priority;
                          $best_url = $result['location'];
                      }
                  }

                  if ($best_url) {
                      $order->download_url = $best_url;
                  }
              }

              $order->save();
          }

          return response()->json($order);
      } catch (\Exception $e) {
          Log::error('Error verificando estado de orden Planet', ['error' => $e->getMessage()]);
          return response()->json(['error' => 'Error al consultar estado'], 500);
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
