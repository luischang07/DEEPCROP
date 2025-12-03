<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class AIModelController extends Controller
{
  protected $apiUrl = 'http://127.0.0.1:8001/api/v1'; // Adjust if needed

  public function index()
  {
    return Inertia::render('ai-model');
  }

  public function models()
  {
    try {
      $response = Http::get("{$this->apiUrl}/models/");
      return $response->json();
    } catch (\Exception $e) {
      return response()->json(['error' => 'Could not connect to AI API'], 500);
    }
  }

  public function predict(Request $request)
  {
    $request->validate([
      'image' => 'required|file|mimes:jpeg,png,jpg,tif,tiff',
      'model_id' => 'required|string',
      'threshold' => 'required|numeric',
      'stride' => 'required|numeric',
    ]);

    try {
      $image = $request->file('image');

      // Prepare the multipart request
      $response = Http::attach(
        'image',
        file_get_contents($image->path()),
        $image->getClientOriginalName()
      )->post("{$this->apiUrl}/inference/predict", [
            'model_id' => $request->model_id,
            'threshold' => $request->threshold,
            'stride' => $request->stride,
            'batch_size' => 1, // Default
          ]);

      \Illuminate\Support\Facades\Log::info('Python API Response: ' . $response->body());
      return $response->json();
    } catch (\Exception $e) {
      return response()->json(['error' => $e->getMessage()], 500);
    }
  }

  public function status($jobId)
  {
    try {
      $response = Http::get("{$this->apiUrl}/inference/status/{$jobId}");
      return $response->json();
    } catch (\Exception $e) {
      return response()->json(['error' => 'Could not connect to AI API'], 500);
    }
  }
  public function train(Request $request)
  {
    $request->validate([
      'images_folder' => 'required|string',
      'masks_folder' => 'required|string',
      'epochs' => 'required|integer',
      'batch_size' => 'required|integer',
    ]);

    try {
      $response = Http::post("{$this->apiUrl}/training/start", [
        'images_folder' => $request->images_folder,
        'masks_folder' => $request->masks_folder,
        'patch_size' => $request->patch_size ?? 256,
        'stride' => $request->stride ?? 128,
        'batch_size' => $request->batch_size,
        'epochs' => $request->epochs,
        'backbone' => $request->backbone ?? 'resnet34',
      ]);

      return $response->json();
    } catch (\Exception $e) {
      return response()->json(['error' => $e->getMessage()], 500);
    }
  }

  public function uploadModel(Request $request)
  {
    $request->validate([
      'file' => 'required|file', // Adjust mimes as needed
    ]);

    try {
      $file = $request->file('file');

      $response = Http::attach(
        'file',
        file_get_contents($file->path()),
        $file->getClientOriginalName()
      )->post("{$this->apiUrl}/models/upload", [
            'description' => $request->description,
          ]);

      return $response->json();
    } catch (\Exception $e) {
      return response()->json(['error' => $e->getMessage()], 500);
    }
  }

  public function trainingStatus($jobId)
  {
    try {
      $response = Http::get("{$this->apiUrl}/training/status/{$jobId}");
      return $response->json();
    } catch (\Exception $e) {
      return response()->json(['error' => 'Could not connect to AI API'], 500);
    }
  }
}
