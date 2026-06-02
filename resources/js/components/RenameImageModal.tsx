import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { WorkspaceImage } from '@/types/workspace';
import { imageApi } from '@/services/imageApi';

interface RenameImageModalProps {
    workspaceId: string;
    image: WorkspaceImage | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedImage: WorkspaceImage) => void;
}

export const RenameImageModal: React.FC<RenameImageModalProps> = ({
    workspaceId,
    image,
    isOpen,
    onClose,
    onSuccess
}) => {
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (image && isOpen) {
            setNewName(image.name);
            setError(null);
        }
    }, [image, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!image || !newName.trim()) {
            setError('El nombre no puede estar vacío');
            return;
        }

        if (newName.trim() === image.name) {
            onClose();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const updatedImage = await imageApi.updateImage(workspaceId, image.id, {
                name: newName.trim()
            });
            
            onSuccess(updatedImage);
            onClose();
        } catch (err) {
            console.error('Error renaming image:', err);
            setError('Error al cambiar el nombre de la imagen');
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
                    <DialogTitle>Cambiar nombre de imagen</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nuevo nombre</Label>
                        <Input
                            id="name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Ingresa el nuevo nombre..."
                            disabled={loading}
                            autoFocus
                        />
                        <p className="text-sm text-gray-500">
                            Archivo original: {image.original_name}
                        </p>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading || !newName.trim() || newName.trim() === image.name}
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};