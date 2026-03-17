<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class AIModelController extends Controller
{
  protected $apiUrl;

  public function __construct()
  {
    $this->apiUrl = config('services.ai.service_url', 'http://localhost:8002') . '/api/v1';
  }

  public function index(Request $request)
  {
    $user = auth()->user();

    // Get workspace IDs where user is a member
    $workspaceUsers = \App\Models\WorkspaceUser::where('user_id', $user->_id)
      ->pluck('workspace_id')
      ->toArray();

    // Get workspaces created by user or where user is a member
    $workspaces = \App\Models\Workspace::where(function ($query) use ($user, $workspaceUsers) {
      $query->where('owner_id', $user->_id)
        ->orWhereIn('_id', $workspaceUsers);
    })
      ->get(['_id', 'name'])
      ->map(function ($workspace) {
        return [
          'id' => (string) $workspace->_id,
          'name' => $workspace->name
        ];
      });

    return Inertia::render('ai-model', [
      'workspaces' => $workspaces,
      'initialJobId' => $request->query('job_id'),
      'initialWorkspaceId' => $request->query('workspace_id'),
    ]);
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
      'use_water_stress' => 'sometimes|boolean',
      'workspace_id' => 'sometimes|string',
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
            'use_water_stress' => true,
            'workspace_id' => $request->workspace_id,
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

  public function preview($jobId)
  {
    try {
      $type = request()->query('type', 'preview');
      $response = Http::get("{$this->apiUrl}/inference/preview/{$jobId}", [
        'type' => $type
      ]);
      
      if ($response->successful()) {
        $headers = [
          'Content-Type' => $response->header('Content-Type') ?: 'image/png',
          'Cache-Control' => 'public, max-age=3600',
        ];
        
        // Proxy Content-Disposition if present (for correct download filenames)
        if ($response->hasHeader('Content-Disposition')) {
            $headers['Content-Disposition'] = $response->header('Content-Disposition');
        }
        
        return response($response->body(), 200, $headers);
      }
      
      return response()->json(['error' => 'Image not found'], 404);
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

  public function listInferences()
  {
    try {
      $workspaceId = request()->query('workspace_id');
      $limit = request()->query('per_page', 10);
      $page = request()->query('page', 1);
      $offset = ($page - 1) * $limit;
      
      $response = Http::get("{$this->apiUrl}/inference/jobs", [
        'workspace_id' => $workspaceId,
        'limit' => $limit,
        'offset' => $offset
      ]);
      
      $data = $response->json();
      $total = $data['total'] ?? 0;
      $jobs = $data['jobs'] ?? [];
      
      return response()->json([
        'data' => $jobs,
        'meta' => [
          'current_page' => (int) $page,
          'per_page' => (int) $limit,
          'total' => $total,
          'last_page' => ceil($total / $limit)
        ]
      ]);
    } catch (\Exception $e) {
      return response()->json(['error' => 'Could not connect to AI API'], 500);
    }
  }

  public function deleteInference($jobId)
  {
    try {
      $response = Http::delete("{$this->apiUrl}/inference/{$jobId}");
      return $response->json();
    } catch (\Exception $e) {
      return response()->json(['error' => 'Could not connect to AI API'], 500);
    }
  }
}
