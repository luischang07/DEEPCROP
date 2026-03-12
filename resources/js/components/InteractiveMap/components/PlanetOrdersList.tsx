import React, { useState, useEffect } from 'react';

interface PlanetOrder {
    id: number;
    order_id: string;
    name: string | null;
    status: string;
    download_url: string | null;
    created_at: string;
}

export const PlanetOrdersList: React.FC = () => {
    const [orders, setOrders] = useState<PlanetOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/satellite/planet/orders');
            if (!response.ok) throw new Error('Error al obtener pedidos');
            const data = await response.json();
            setOrders(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const checkStatus = async (orderId: string) => {
        try {
            const response = await fetch(`/api/satellite/planet/orders/${orderId}`);
            if (!response.ok) throw new Error('Error al revisar estado');
            
            // Refrescar toda la lista después de actualizar una 
            await fetchOrders();
        } catch (e: any) {
            console.error('Error verificando estado:', e);
            alert('Error al verificar: ' + e.message);
        }
    };

    const handleDownload = (url: string, name: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = `${name || 'planet_order'}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    if (loading && orders.length === 0) {
        return <div className="p-4 text-center text-gray-500">Cargando pedidos...</div>;
    }

    if (orders.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Mis Pedidos Planet</h3>
                <button 
                    onClick={fetchOrders}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Actualizar lista"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {orders.map((order) => (
                    <div key={order.id} className="bg-white border rounded p-3 flex flex-col gap-2 shadow-sm">
                        <div className="flex justify-between items-start">
                            <span className="font-medium text-sm text-gray-800 truncate" title={order.name || order.order_id}>
                                {order.name || order.order_id.substring(0, 15) + '...'}
                            </span>
                            
                            {/* Status Badge */}
                            {order.status === 'success' ? (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                    ✅ Listo
                                </span>
                            ) : order.status === 'failed' ? (
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                    ❌ Fallido
                                </span>
                            ) : order.status === 'running' ? (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                    🔄 Procesando
                                </span>
                            ) : (
                                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                    🕒 En Cola
                                </span>
                            )}
                        </div>

                        <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">
                                {new Date(order.created_at).toLocaleDateString()}
                            </span>
                            
                            {/* Action Buttons */}
                            {order.status === 'success' && order.download_url ? (
                                <button
                                    onClick={() => handleDownload(order.download_url!, order.name || order.order_id)}
                                    className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs font-medium transition-colors"
                                >
                                    Descargar ZIP
                                </button>
                            ) : order.status !== 'failed' ? (
                                <button
                                    onClick={() => checkStatus(order.order_id)}
                                    className="text-blue-600 hover:underline text-xs"
                                >
                                    Verificar estado
                                </button>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
