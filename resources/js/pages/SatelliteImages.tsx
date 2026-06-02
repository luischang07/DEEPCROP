import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import SatelliteSearch from '@/components/SatelliteSearch';

export default function SatelliteImages() {
    return (
        <AppLayout 
            breadcrumbs={[
                { title: 'Inicio', href: '/' },
                { title: 'Imágenes Satelitales', href: '/satellite-images' }
            ]}
        >
            <Head title="Imágenes Satelitales" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <SatelliteSearch />
                </div>
            </div>
        </AppLayout>
    );
}
