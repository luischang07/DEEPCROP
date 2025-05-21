<?php

namespace App\Http\Controllers;

use App\Services\SentinelService;
use Illuminate\Http\Request;

class SentinelController extends Controller
{
    public function __construct(
        private SentinelService $service
    ) {}

    // Método original que usa Sentinel Hub
    public function receiveCoordinates(Request $request)
    {
        $validated = $request->validate([
            'coordinates' => 'required|array|min:3',
            'coordinates.*' => 'required|array|min:2|max:2',
            'coordinates.*.*' => 'required|numeric',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $accessToken = $this->service->getToken();
        $products = $this->service->searchProducts($accessToken, $validated);

        return response()->json([
            'products' => $products,
            'message' => 'Productos encontrados'
        ]);
    }

    // Nuevo método que consulta imágenes desde Google Earth Engine usando archivo temporal
    public function searchEngine(Request $request)
    {
        $validated = $request->validate([
            'coordinates' => 'required|array|min:3',
            'coordinates.*' => 'required|array|min:2|max:2',
            'coordinates.*.*' => 'required|numeric',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $geojson = [
            'type' => 'Polygon',
            'coordinates' => [ $validated['coordinates'] ]
        ];

        $tempFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'temp_geojson.json';
        file_put_contents($tempFile, json_encode($geojson));

        $pythonScript = '"C:\Users\Luis Lopez\Desktop\DEEPCROP\app\scripts\search_gee.py"';
        $start = escapeshellarg($validated['start_date']);
        $end = escapeshellarg($validated['end_date']);
        $tempFileArg = escapeshellarg($tempFile);

        $command = "python $pythonScript $tempFileArg $start $end";
        $output = shell_exec($command);

        unlink($tempFile);

        if (!$output) {
            return response()->json([
                'message' => 'Error ejecutando el script de Earth Engine',
            ], 500);
        }

        $result = json_decode($output, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json([
                'message' => 'Respuesta del script inválida',
                'raw_output' => $output
            ], 500);
        }

        return response()->json([
            'results' => $result,
            'message' => 'Resultados obtenidos desde Google Earth Engine'
        ]);
    }

    // Nuevo método para descargar banda desde GEE
   public function downloadBand(Request $request)
{
    $validated = $request->validate([
        'image_id' => 'required|string',
        'band_name' => 'required|string',
    ]);

    $pythonScript = '"C:\Users\Luis Lopez\Desktop\DEEPCROP\app\scripts\download_image.py"';
    $command = 'python ' . $pythonScript . ' ' . 
               escapeshellarg($validated['image_id']) . ' ' . 
               escapeshellarg($validated['band_name']) . ' 2>&1';

    $output = shell_exec($command);

    if ($output === null) {
        return response()->json([
            'error' => 'El script Python no devolvió ninguna salida',
            'command' => $command
        ], 500);
    }

    $result = json_decode($output, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return response()->json([
            'error' => 'Respuesta del script inválida',
            'raw_output' => $output,
            'json_error' => json_last_error_msg()
        ], 500);
    }

    if (isset($result['error'])) {
        return response()->json([
            'error' => 'Error en el script Python',
            'details' => $result['error'],
            'full_response' => $result
        ], 500);
    }

    if (!isset($result['download_url'])) {
        return response()->json([
            'error' => 'El script no devolvió una URL de descarga',
            'full_response' => $result
        ], 500);
    }

    return response()->json([
        'result' => $result,
        'message' => 'Enlace de descarga generado'
    ]);
}
}
