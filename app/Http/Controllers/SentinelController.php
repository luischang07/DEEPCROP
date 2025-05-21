<?php

namespace App\Http\Controllers;

use App\Services\SentinelService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;


class SentinelController extends Controller
{
    public function __construct(
        private SentinelService $service
    ) {}
    
    public function coordinatesForDownload(Request $request)
    {
        $validated = $request->validate([
            'coordinates' => 'required|array|min:3',
            'coordinates.*' => 'required|array|min:2|max:2',
            'coordinates.*.*' => 'required|numeric',
            'id' => 'required',
            'sampleType' => 'required|in:UINT8,UINT16,INT16,FLOAT32',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'resolution' => 'sometimes|numeric|min:1|max:60',
        ]);

        // Genera un ID único para el archivo
        $requestId = uniqid('sentinel_', true);
        $fileName = "$requestId.tif";

        // Procesa y guarda la imagen directamente
        $accessToken = $this->service->getToken();
        $imageContent = $this->service->fetchImage($accessToken, $validated);

        // Guarda la imagen en el directorio
        Storage::put("sentinel/images/$fileName", $imageContent);

        return response()->json([
            'file_name' => $fileName,
            'download_url' => route('download.sentinel', $fileName),
            'message' => 'Imagen descargada y guardada correctamente'
        ]);
    }

    public function downloadImage($fileName)
    {
        $filePath = "sentinel/images/$fileName";

        if (!Storage::exists($filePath)) {
            abort(404, 'Archivo no encontrado');
        }

        return Storage::download($filePath, $fileName);
    }

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
}