import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Upload, Plus, Trash2 } from 'lucide-react';
import { UploadImageData } from '@/types/workspace';
import { useImageUpload } from '@/services/imageApi';

interface ImageUploadModalProps {
    workspaceId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    allowMultiple?: boolean;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
    workspaceId,
    isOpen,
    onClose,
    onSuccess,
    allowMultiple = false
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [customName, setCustomName] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const { uploadImage, isUploading, uploadProgress, error, reset } = useImageUpload();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (allowMultiple) {
            setSelectedFiles(prev => [...prev, ...files]);
        } else {
            setSelectedFiles(files.slice(0, 1));
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const addTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags(prev => [...prev, newTag.trim()]);
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) return;

        try {
            if (allowMultiple) {
                // Implementar subida múltiple
                // Por ahora, subir una por una
                for (const file of selectedFiles) {
                    await uploadImage(workspaceId, {
                        image: file,
                        name: customName || undefined,
                        tags: tags.length > 0 ? tags : undefined
                    });
                }
            } else {
                await uploadImage(workspaceId, {
                    image: selectedFiles[0],
                    name: customName || undefined,
                    tags: tags.length > 0 ? tags : undefined
                });
            }

            // Limpiar formulario y cerrar modal
            setSelectedFiles([]);
            setCustomName('');
            setTags([]);
            setNewTag('');
            reset();
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error uploading images:', err);
        }
    };

    const formatFileSize = (bytes: number): string => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>
                            {allowMultiple ? 'Subir Imágenes' : 'Subir Imagen'}
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Selector de archivos */}
                    <div>
                        <Label htmlFor="file-upload">
                            Seleccionar {allowMultiple ? 'Imágenes' : 'Imagen'}
                        </Label>
                        <div className="mt-2">
                            <input
                                id="file-upload"
                                type="file"
                                multiple={allowMultiple}
                                accept="image/tiff,image/jpeg,image/png,image/jp2,application/x-tiff"
                                onChange={handleFileSelect}
                                className="block w-full text-sm text-gray-500 
                                         file:mr-4 file:py-2 file:px-4
                                         file:rounded-md file:border-0
                                         file:text-sm file:font-medium
                                         file:bg-blue-50 file:text-blue-700
                                         hover:file:bg-blue-100"
                            />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Tipos soportados: TIFF, JPEG, PNG, JP2. Máximo 500MB por imagen.
                        </p>
                    </div>

                    {/* Lista de archivos seleccionados */}
                    {selectedFiles.length > 0 && (
                        <div>
                            <Label>Archivos Seleccionados</Label>
                            <div className="mt-2 space-y-2">
                                {selectedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{file.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {formatFileSize(file.size)} • {file.type}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFile(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Nombre personalizado */}
                    <div>
                        <Label htmlFor="custom-name">Nombre Personalizado (Opcional)</Label>
                        <Input
                            id="custom-name"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="Ej: Imagen satelital zona norte"
                            className="mt-2"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <Label>Tags (Opcional)</Label>
                        <div className="mt-2 flex gap-2">
                            <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder="Agregar tag..."
                                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                                className="flex-1"
                            />
                            <Button type="button" onClick={addTag} size="sm">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="cursor-pointer">
                                        {tag}
                                        <X
                                            className="h-3 w-3 ml-1"
                                            onClick={() => removeTag(tag)}
                                        />
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Progreso de subida */}
                    {isUploading && (
                        <div>
                            <Label>Progreso de Subida</Label>
                            <Progress value={uploadProgress} className="mt-2" />
                            <p className="text-sm text-gray-500 mt-1">{uploadProgress}%</p>
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={onClose} disabled={isUploading}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={selectedFiles.length === 0 || isUploading}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {isUploading ? 'Subiendo...' : 'Subir'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};