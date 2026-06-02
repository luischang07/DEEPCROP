<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspaceUser extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'workspace_users';

    protected $fillable = [
        'workspace_id',
        'user_id',
        'role',
        'joined_at',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    public function canEdit(): bool
    {
        return in_array($this->role, ['owner', 'editor']);
    }

    public function canManage(): bool
    {
        return $this->role === 'owner';
    }
}
