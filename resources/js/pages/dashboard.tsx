import AppLayout from '@/layouts/app-layout';
import InteractiveMap from '@/components/InteractiveMap';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Imagen satelital',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const handleAreaSelected = (area: unknown) => {
        console.log('Área seleccionada:', area);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-2">
                <div className="flex min-h-svh flex-row items-center justify-center rounded-xl">
                    <InteractiveMap 
                        onAreaSelected={handleAreaSelected}
                        className="w-full h-full"
                    />
                </div>
            </div>
        </AppLayout>
    );
}
