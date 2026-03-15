import React, { useState } from 'react';
import { InferenceJob, aiApi } from '../services/aiApi';
import { 
    FileText, 
    Trash2, 
    Calendar, 
    CheckCircle, 
    Clock, 
    AlertCircle,
    Activity,
    ExternalLink,
    Search,
    Eye
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InferenceListProps {
    workspaceId: string;
    inferences: InferenceJob[];
    loading: boolean;
    onDelete: (jobId: string) => void;
    onRefresh: () => void;
}

export const InferenceList: React.FC<InferenceListProps> = ({
    workspaceId,
    inferences,
    loading,
    onDelete,
    onRefresh
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInferences = inferences.filter(inf => 
        inf.job_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inf.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'pending':
            case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return 'Completado';
            case 'failed': return 'Fallido';
            case 'pending': return 'Pendiente';
            case 'running': return 'En curso';
            default: return status;
        }
    };

    if (loading && inferences.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (inferences.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay inferencias procesadas en este espacio</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por ID o estado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            <div className="grid grid-cols-1 gap-3">
                {filteredInferences.map((inf) => (
                    <Card key={inf.job_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <FileText className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-md">
                                            {inf.job_id}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(inf.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                {getStatusIcon(inf.status)}
                                                {getStatusText(inf.status)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {inf.status === 'completed' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(`/ai-model?job_id=${inf.job_id}&workspace_id=${workspaceId}`, '_blank')}
                                            className="text-gray-600 hover:text-indigo-600"
                                            title="Ver resultados"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDelete(inf.job_id)}
                                        className="text-gray-400 hover:text-red-600"
                                        title="Eliminar inferencia"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {inf.status === 'completed' && (
                                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {inf.stress_severity && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Severidad</p>
                                            <p className="text-sm font-semibold text-gray-900">{inf.stress_severity}</p>
                                        </div>
                                    )}
                                    {inf.anomaly_percentage_in_crop !== undefined && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">% Afectado (Crop)</p>
                                            <p className="text-sm font-semibold text-gray-900">{inf.anomaly_percentage_in_crop.toFixed(1)}%</p>
                                        </div>
                                    )}
                                    {inf.anomaly_percentage !== undefined && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">% Anomalía Total</p>
                                            <p className="text-sm font-semibold text-gray-900">{inf.anomaly_percentage.toFixed(1)}%</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Progreso</p>
                                        <p className="text-sm font-semibold text-gray-900">{(inf.progress * 100).toFixed(0)}%</p>
                                    </div>
                                </div>
                            )}

                            {inf.status === 'failed' && inf.error_message && (
                                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                                    Error: {inf.error_message}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

