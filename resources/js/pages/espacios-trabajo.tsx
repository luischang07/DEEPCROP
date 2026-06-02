import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { WorkspaceList } from '@/components/WorkspaceList';
import { WorkspaceDetailView } from '@/components/WorkspaceDetailView';
import { Workspace } from '@/types/workspace';

export default function EspaciosTrabajo() {
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

    const handleSelectWorkspace = (workspace: Workspace) => {
        setSelectedWorkspace(workspace);
    };

    const handleBackToList = () => {
        setSelectedWorkspace(null);
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Espacios de Trabajo', href: '/espacios-trabajo' }
        ]}>
            <Head title="Espacios de Trabajo" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        {selectedWorkspace ? (
                            <WorkspaceDetailView
                                workspaceId={selectedWorkspace.id}
                                onBack={handleBackToList}
                            />
                        ) : (
                            <WorkspaceList
                                onSelectWorkspace={handleSelectWorkspace}
                            />
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
