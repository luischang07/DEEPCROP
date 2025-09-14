import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, FileImage } from 'lucide-react';
import { WorkspaceImage } from '@/types/workspace';
import { imageApi } from '@/services/imageApi';

interface DeleteImageModalProps {
    workspaceId: string;
    image: WorkspaceImage | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const DeleteImageModal: React.FC<DeleteImageModalProps> = ({
    workspaceId,
    image,
    isOpen,
    onClose,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!image) return;

        setLoading(true);
        setError(null);

        try {
            await imageApi.deleteImage(workspaceId, image.id);
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error deleting image:', err);
            setError('Error al eliminar la imagen. Por favor, inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
            setError(null);
        }
    };

    if (!image) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <DialogTitle>Eliminar imagen</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <FileImage className="h-8 w-8 text-gray-400" />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                    {image.name}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                    {image.original_name}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {image.formatted_size} • {image.mime_type}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-gray-700">
                            ¿Estás seguro de que quieres eliminar esta imagen?
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-red-800 text-sm font-medium">
                                ⚠️ Esta acción no se puede deshacer
                            </p>
                            <p className="text-red-700 text-sm mt-1">
                                La imagen será eliminada permanentemente del almacenamiento y no podrá ser recuperada.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading ? 'Eliminando...' : 'Eliminar imagen'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};