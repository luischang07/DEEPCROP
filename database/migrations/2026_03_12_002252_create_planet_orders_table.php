<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('planet_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_id')->unique();
            $table->string('name')->nullable();
            $table->string('status')->default('queued'); // queued, running, success, failed, partial
            $table->json('metadata')->nullable();
            $table->text('download_url')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('planet_orders');
    }
};
