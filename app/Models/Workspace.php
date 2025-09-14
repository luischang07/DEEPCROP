<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Workspace extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'workspaces';

    protected $fillable = [
        'name',
        'description',
        'owner_id',
        'type',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(WorkspaceFile::class, 'workspace_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(WorkspaceImage::class, 'workspace_id');
    }

    public function workspaceUsers(): HasMany
    {
        return $this->hasMany(WorkspaceUser::class, 'workspace_id');
    }

    public function users()
    {
        // Para MongoDB, usamos una implementación manual
        return $this->workspaceUsers()->with('user');
    }

    public function isPersonal(): bool
    {
        return $this->type === 'personal';
    }

    public function isOwner(User $user): bool
    {
        return $this->owner_id === $user->_id;
    }

    public function getUserRole(User $user): ?string
    {
        if ($this->isOwner($user)) {
            return 'owner';
        }

        $workspaceUser = $this->workspaceUsers()->where('user_id', $user->_id)->first();
        return $workspaceUser?->role;
    }

    public function hasPermission(User $user, string $permission): bool
    {
        $role = $this->getUserRole($user);
        
        if (!$role) {
            return false;
        }

        return match ($permission) {
            'read' => in_array($role, ['owner', 'editor', 'viewer']),
            'write' => in_array($role, ['owner', 'editor']),
            'manage' => $role === 'owner',
            'delete' => in_array($role, ['owner', 'editor']),
            default => false,
        };
    }

    protected static function boot()
    {
        parent::boot();

        static::created(function ($workspace) {
            // Agregar automáticamente al propietario como miembro
            $workspace->workspaceUsers()->create([
                'user_id' => $workspace->owner_id,
                'role' => 'owner',
                'joined_at' => now(),
            ]);
        });

        // Borrado en cascada: eliminar archivos físicos y registros relacionados
        static::deleting(function ($workspace) {
            // Eliminar archivos asociados (registros y archivos en disco)
            $files = $workspace->files()->get();
            foreach ($files as $file) {
                try {
                    if (!empty($file->file_path) && Storage::disk('private')->exists($file->file_path)) {
                        Storage::disk('private')->delete($file->file_path);
                    }
                } catch (\Exception $e) {
                    // Registrar pero continuar con el borrado de registros
                    \Log::error('Error deleting workspace file from storage: ' . $e->getMessage());
                }

                try {
                    $file->delete();
                } catch (\Exception $e) {
                    \Log::error('Error deleting workspace file record: ' . $e->getMessage());
                }
            }

            // Eliminar miembros del workspace
            try {
                $workspace->workspaceUsers()->delete();
            } catch (\Exception $e) {
                \Log::error('Error deleting workspace users: ' . $e->getMessage());
            }
        });
    }
}
