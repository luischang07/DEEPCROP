<?php

namespace App\Http\Controllers;

use App\Services\SentinelService;
use Illuminate\Http\Request;

class SentinelController extends Controller
{
    public function __construct(
        private SentinelService $service
    ) {}

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