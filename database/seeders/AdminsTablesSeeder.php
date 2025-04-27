<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;

class AdminsTablesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $password = Hash::make('1234');
        $adminRecords = [
            [
                'name' => 'Admin',
                'type' => 'admin',
                'email' => 'admin@admin.com',
                'password' => $password,
                'image' => '',
                'status' => 1
            ],
        ];

        Admin::insert($adminRecords);
    }
}
