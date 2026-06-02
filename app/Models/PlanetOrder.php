<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class PlanetOrder extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'planet_orders';

    protected $fillable = [
        'order_id',
        'name',
        'status',
        'metadata',
        'download_url'
    ];

    protected $casts = [
        'metadata' => 'array',
    ];
}
