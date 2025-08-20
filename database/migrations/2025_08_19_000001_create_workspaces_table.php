<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('workspaces', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['personal', 'shared'])->default('shared');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['owner_id', 'type']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('workspaces');
    }
};
