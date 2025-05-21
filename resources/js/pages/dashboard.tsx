import AppLayout from '@/layouts/app-layout';
import Browser from '@/pages/browser';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import '../../css/dashboard.css'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Buscador de imágenes',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="browser-container">
                <Browser></Browser>
            </div>
        </AppLayout>
    );
}
