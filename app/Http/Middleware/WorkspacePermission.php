<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Workspace;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class WorkspacePermission
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $permission = 'read'): Response
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado',
            ], 401);
        }

        // Obtener el workspace desde la ruta
        $workspaceId = $request->route('workspace');
        
        if ($workspaceId instanceof Workspace) {
            $workspace = $workspaceId;
        } else {
            $workspace = Workspace::find($workspaceId);
        }

        if (!$workspace) {
            return response()->json([
                'success' => false,
                'message' => 'Espacio de trabajo no encontrado',
            ], 404);
        }

        if (!$workspace->hasPermission($user, $permission)) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para realizar esta acción',
            ], 403);
        }

        return $next($request);
    }
}
