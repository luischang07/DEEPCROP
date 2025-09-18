<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
use App\Models\User;
use App\Models\WorkspaceUser;
use App\Models\WorkspaceFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class WorkspaceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        // Para MongoDB, obtenemos los workspace IDs donde el usuario es miembro
        $workspaceIds = WorkspaceUser::where('user_id', $user->_id)->pluck('workspace_id');
        // Cargar workspaces y owner de forma eager
        $workspacesCollection = Workspace::whereIn('_id', $workspaceIds)
            ->with(['owner'])
            ->get();

        // Obtener counts agrupados en batch para evitar N+1
        // For MongoDB avoid raw SQL expressions; fetch and group in PHP
        $filesCounts = WorkspaceFile::whereIn('workspace_id', $workspacesCollection->pluck('_id')->toArray())
            ->get()
            ->groupBy('workspace_id')
            ->map(function ($group) { return $group->count(); })
            ->toArray();

        $membersCounts = WorkspaceUser::whereIn('workspace_id', $workspacesCollection->pluck('_id')->toArray())
            ->get()
            ->groupBy('workspace_id')
            ->map(function ($group) { return $group->count(); })
            ->toArray();

        $workspaces = $workspacesCollection->map(function ($workspace) use ($user, $filesCounts, $membersCounts) {
            $filesCount = $filesCounts[$workspace->_id] ?? 0;
            $membersCount = $membersCounts[$workspace->_id] ?? 0;

            return [
                'id' => $workspace->_id,
                'name' => $workspace->name,
                'description' => $workspace->description,
                'type' => $workspace->type,
                'owner' => [
                    'id' => $workspace->owner->_id,
                    'name' => $workspace->owner->name,
                    'email' => $workspace->owner->email,
                ],
                'user_role' => $workspace->getUserRole($user),
                'files_count' => $filesCount,
                'members_count' => $membersCount,
                'created_at' => $workspace->created_at,
                'updated_at' => $workspace->updated_at,
            ];
        })->sortBy([
            ['type', 'desc'], // Personal primero
            ['updated_at', 'desc']
        ])->values();

        return response()->json([
            'success' => true,
            'data' => $workspaces,
        ]);
    }

    public function show(Workspace $workspace): JsonResponse
    {
        $user = Auth::user();

        if (!$workspace->hasPermission($user, 'read')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para acceder a este espacio de trabajo',
            ], 403);
        }

        // Cargar relaciones manualmente para MongoDB
        $workspace->load('owner');
        
        // Obtener miembros
        $members = WorkspaceUser::where('workspace_id', $workspace->_id)
            ->with('user')
            ->get()
            ->map(function ($wu) {
                return [
                    'id' => $wu->_id,
                    'user' => [
                        'id' => $wu->user->_id,
                        'name' => $wu->user->name,
                        'email' => $wu->user->email,
                    ],
                    'role' => $wu->role,
                    'joined_at' => $wu->joined_at,
                ];
            });

        // Por defecto no retornamos la lista completa de archivos para evitar payloads pesados
        $files = [];
        // Small preview to show in the UI without requesting full files list
        $filesPreview = WorkspaceFile::where('workspace_id', $workspace->_id)
            ->with('uploadedBy')
            ->orderBy('created_at', 'desc')
            ->take(3)
            ->get()
            ->map(function ($file) {
                return [
                    'id' => $file->_id,
                    'name' => $file->name,
                    'file_size_formatted' => $file->getFileSizeFormatted(),
                    'mime_type' => $file->mime_type,
                    'has_geospatial_data' => $file->hasGeospatialData(),
                    'uploaded_by' => [
                        'id' => $file->uploadedBy->_id,
                        'name' => $file->uploadedBy->name,
                    ],
                    'created_at' => $file->created_at,
                ];
            })->toArray();
        $includeFiles = request()->boolean('include_files', false);
        $filesPerPage = intval(request()->get('files_per_page', 0));

        if ($includeFiles || $filesPerPage > 0) {
            $query = WorkspaceFile::where('workspace_id', $workspace->_id)->with('uploadedBy')->orderBy('created_at', 'desc');
            if ($filesPerPage > 0) {
                $paginated = $query->paginate($filesPerPage);
                $files = $paginated->getCollection()->map(function ($file) {
                    return [
                        'id' => $file->_id,
                        'name' => $file->name,
                        'original_name' => $file->original_name,
                        'file_size' => $file->file_size,
                        'file_size_formatted' => $file->getFileSizeFormatted(),
                        'mime_type' => $file->mime_type,
                        'is_tiff' => $file->isTiff(),
                        'has_geospatial_data' => $file->hasGeospatialData(),
                        'coordinates' => $file->getCoordinatesArray(),
                        'is_processed' => $file->is_processed,
                        'processing_notes' => $file->processing_notes,
                        'metadata' => $file->metadata,
                        'uploaded_by' => [
                            'id' => $file->uploadedBy->_id,
                            'name' => $file->uploadedBy->name,
                        ],
                        'created_at' => $file->created_at,
                        'updated_at' => $file->updated_at,
                    ];
                })->toArray();
            } else {
                $files = $query->get()->map(function ($file) {
                    return [
                        'id' => $file->_id,
                        'name' => $file->name,
                        'original_name' => $file->original_name,
                        'file_size' => $file->file_size,
                        'file_size_formatted' => $file->getFileSizeFormatted(),
                        'mime_type' => $file->mime_type,
                        'is_tiff' => $file->isTiff(),
                        'has_geospatial_data' => $file->hasGeospatialData(),
                        'coordinates' => $file->getCoordinatesArray(),
                        'is_processed' => $file->is_processed,
                        'processing_notes' => $file->processing_notes,
                        'metadata' => $file->metadata,
                        'uploaded_by' => [
                            'id' => $file->uploadedBy->_id,
                            'name' => $file->uploadedBy->name,
                        ],
                        'created_at' => $file->created_at,
                        'updated_at' => $file->updated_at,
                    ];
                })->toArray();
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $workspace->_id,
                'name' => $workspace->name,
                'description' => $workspace->description,
                'type' => $workspace->type,
                'owner' => [
                    'id' => $workspace->owner->_id,
                    'name' => $workspace->owner->name,
                    'email' => $workspace->owner->email,
                ],
                'user_role' => $workspace->getUserRole($user),
                'members' => $members,
                'files' => $files,
                'files_count' => WorkspaceFile::where('workspace_id', $workspace->_id)->count(),
                'members_count' => WorkspaceUser::where('workspace_id', $workspace->_id)->count(),
                'created_at' => $workspace->created_at,
                'updated_at' => $workspace->updated_at,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'type' => ['required', Rule::in(['personal', 'shared'])],
        ]);

        $user = Auth::user();

        // Verificar si ya tiene un espacio personal
        if ($request->type === 'personal') {
            $existingPersonal = $user->ownedWorkspaces()
                ->where('type', 'personal')
                ->exists();

            if ($existingPersonal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ya tienes un espacio de trabajo personal',
                ], 422);
            }
        }

        $workspace = $user->ownedWorkspaces()->create([
            'name' => $request->name,
            'description' => $request->description,
            'type' => $request->type,
        ]);

        $workspace->load('owner');

        return response()->json([
            'success' => true,
            'message' => 'Espacio de trabajo creado exitosamente',
            'data' => [
                'id' => $workspace->_id,
                'name' => $workspace->name,
                'description' => $workspace->description,
                'type' => $workspace->type,
                'owner' => [
                    'id' => $workspace->owner->_id,
                    'name' => $workspace->owner->name,
                    'email' => $workspace->owner->email,
                ],
                'user_role' => 'owner',
                'created_at' => $workspace->created_at,
            ],
        ], 201);
    }

    public function update(Request $request, Workspace $workspace): JsonResponse
    {
        $user = Auth::user();

        if (!$workspace->hasPermission($user, 'manage')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para editar este espacio de trabajo',
            ], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $workspace->update([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Espacio de trabajo actualizado exitosamente',
            'data' => [
                'id' => $workspace->_id,
                'name' => $workspace->name,
                'description' => $workspace->description,
                'updated_at' => $workspace->updated_at,
            ],
        ]);
    }

    public function destroy(Workspace $workspace): JsonResponse
    {
        $user = Auth::user();

        if (!$workspace->hasPermission($user, 'delete')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para eliminar este espacio de trabajo',
            ], 403);
        }

        if ($workspace->isPersonal()) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el espacio de trabajo personal',
            ], 422);
        }

        $workspace->delete();

        return response()->json([
            'success' => true,
            'message' => 'Espacio de trabajo eliminado exitosamente',
        ]);
    }

    public function personal(): JsonResponse
    {
        $user = Auth::user();
        $personalWorkspace = $user->getPersonalWorkspace();

        return $this->show($personalWorkspace);
    }

    public function inviteUser(Request $request, Workspace $workspace): JsonResponse
    {
        $user = Auth::user();

        if (!$workspace->hasPermission($user, 'manage')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para invitar usuarios a este espacio',
            ], 403);
        }

        $request->validate([
            'email' => 'required|email|exists:users,email',
            'role' => ['required', Rule::in(['editor', 'viewer'])],
        ]);

        $invitedUser = User::where('email', $request->email)->first();

        if (WorkspaceUser::where('workspace_id', $workspace->_id)->where('user_id', $invitedUser->_id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario ya es miembro de este espacio de trabajo',
            ], 422);
        }

        $workspace->workspaceUsers()->create([
            'user_id' => $invitedUser->_id,
            'role' => $request->role,
            'joined_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Usuario invitado exitosamente',
            'data' => [
                'user' => [
                    'id' => $invitedUser->_id,
                    'name' => $invitedUser->name,
                    'email' => $invitedUser->email,
                ],
                'role' => $request->role,
            ],
        ]);
    }

    public function updateUserRole(Request $request, Workspace $workspace, User $user): JsonResponse
    {
        $currentUser = Auth::user();

        if (!$workspace->hasPermission($currentUser, 'manage')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para cambiar roles en este espacio',
            ], 403);
        }

        $request->validate([
            'role' => ['required', Rule::in(['editor', 'viewer'])],
        ]);

        $workspaceUser = WorkspaceUser::where('workspace_id', $workspace->_id)
            ->where('user_id', $user->_id)
            ->first();

        if (!$workspaceUser) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario no es miembro de este espacio de trabajo',
            ], 404);
        }

        if ($workspaceUser->role === 'owner') {
            return response()->json([
                'success' => false,
                'message' => 'No se puede cambiar el rol del propietario',
            ], 422);
        }

        $workspaceUser->update(['role' => $request->role]);

        return response()->json([
            'success' => true,
            'message' => 'Rol actualizado exitosamente',
        ]);
    }

    public function removeUser(Request $request, Workspace $workspace, User $user): JsonResponse
    {
        $currentUser = Auth::user();

        if (!$workspace->hasPermission($currentUser, 'manage')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para remover usuarios de este espacio',
            ], 403);
        }

        $workspaceUser = WorkspaceUser::where('workspace_id', $workspace->_id)
            ->where('user_id', $user->_id)
            ->first();

        if (!$workspaceUser) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario no es miembro de este espacio de trabajo',
            ], 404);
        }

        if ($workspaceUser->role === 'owner') {
            return response()->json([
                'success' => false,
                'message' => 'No se puede remover al propietario del espacio',
            ], 422);
        }

        $workspaceUser->delete();

        return response()->json([
            'success' => true,
            'message' => 'Usuario removido exitosamente',
        ]);
    }
}
