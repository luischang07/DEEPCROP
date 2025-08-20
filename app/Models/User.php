<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use MongoDB\Laravel\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Workspaces owned by this user
     */
    public function ownedWorkspaces(): HasMany
    {
        return $this->hasMany(Workspace::class, 'owner_id');
    }

    /**
     * Workspaces where this user is a member
     */
    public function workspaces()
    {
        // Para MongoDB, obtenemos los workspaces a través de workspace_users
        $workspaceIds = WorkspaceUser::where('user_id', $this->_id)->pluck('workspace_id');
        return Workspace::whereIn('_id', $workspaceIds);
    }

    /**
     * Files uploaded by this user
     */
    public function uploadedFiles(): HasMany
    {
        return $this->hasMany(WorkspaceFile::class, 'uploaded_by');
    }

    /**
     * Get or create personal workspace for this user
     */
    public function getPersonalWorkspace(): Workspace
    {
        $personalWorkspace = $this->ownedWorkspaces()
            ->where('type', 'personal')
            ->first();

        if (!$personalWorkspace) {
            $personalWorkspace = $this->ownedWorkspaces()->create([
                'name' => 'Mi Espacio Personal',
                'description' => 'Espacio de trabajo personal de ' . $this->name,
                'type' => 'personal',
            ]);
        }

        return $personalWorkspace;
    }
}
