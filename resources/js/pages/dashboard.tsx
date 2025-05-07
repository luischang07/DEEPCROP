import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Imagen satelital',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-2">
                <div
                    className="flex min-h-svh flex-row items-center justify-evenly rounded-xl"
                    style={{
                        backgroundImage: "url('/images/ejemplo-satelite.jpg')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
            </div>
        </AppLayout>
    );
}
