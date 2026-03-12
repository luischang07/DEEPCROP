<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $orders = App\Models\PlanetOrder::all();
    echo "Orders retrieved successfully. Count: " . $orders->count() . "\n";
    foreach($orders as $order) {
        echo "Order ID: " . $order->order_id . "\n";
        print_r($order->toArray());
    }
} catch (\Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
} catch (\Error $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
