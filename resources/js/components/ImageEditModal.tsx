import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    Chip,
    Paper,
    Grid,
    Alert,
    IconButton,
    FormHelperText,
    InputAdornment
} from '@mui/material';
import {
    Close as CloseIcon,
    Save as SaveIcon,
    Add as AddIcon,
    LocationOn as LocationIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { WorkspaceImage, UpdateImageData } from '@/types/workspace';
import { imageApi } from '@/services/imageApi';

interface ImageEditModalProps {
    workspaceId: string;
    image: WorkspaceImage | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedImage: WorkspaceImage) => void;
}

export const ImageEditModal: React.FC<ImageEditModalProps> = ({
    workspaceId,
    image,
    isOpen,
    onClose,
    onSuccess
}) => {
    const [formData, setFormData] = useState({
        name: '',
        tags: [] as string[],
        center_lat: '',
        center_lng: ''
    });
    const [newTag, setNewTag] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (image) {
            setFormData({
                name: image.name,
                tags: [...image.tags],
                center_lat: image.center_lat?.toString() || '',
                center_lng: image.center_lng?.toString() || ''
            });
            setError(null);
        }
    }, [image]);

    const addTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()]
            }));
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) return;

        setIsLoading(true);
        setError(null);

        try {
            const updateData: UpdateImageData = {
                name: formData.name || undefined,
                tags: formData.tags.length > 0 ? formData.tags : undefined,
            };

            // Agregar coordenadas si están presentes y son válidas
            if (formData.center_lat && formData.center_lng) {
                const lat = parseFloat(formData.center_lat);
                const lng = parseFloat(formData.center_lng);
                
                if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    updateData.center_lat = lat;
                    updateData.center_lng = lng;
                }
            }

            const updatedImage = await imageApi.updateImage(workspaceId, image.id, updateData);
            onSuccess(updatedImage);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al actualizar la imagen');
        } finally {
            setIsLoading(false);
        }
    };

    if (!image) return null;

    return (
        <Dialog 
            open={isOpen} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { minHeight: '60vh' }
            }}
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Typography variant="h6" component="h2">
                    Editar Imagen
                </Typography>
                <IconButton onClick={onClose} disabled={isLoading}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Información del archivo (solo lectura) */}
                    <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Información del Archivo
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                    Nombre original:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                                    {image.original_name}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                    Tamaño:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {image.formatted_size}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                    Tipo:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {image.mime_type}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                    Subida por:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {image.uploaded_by.name}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Nombre personalizado */}
                    <TextField
                        fullWidth
                        label="Nombre"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        margin="normal"
                        required
                        disabled={isLoading}
                    />

                    {/* Coordenadas */}
                    <Box sx={{ mt: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon fontSize="small" />
                            Coordenadas del Centro (Opcional)
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Latitud"
                                    type="number"
                                    inputProps={{ step: 'any' }}
                                    value={formData.center_lat}
                                    onChange={(e) => setFormData(prev => ({ ...prev, center_lat: e.target.value }))}
                                    placeholder="-12.0464"
                                    disabled={isLoading}
                                    helperText="Rango: -90 a 90"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Longitud"
                                    type="number"
                                    inputProps={{ step: 'any' }}
                                    value={formData.center_lng}
                                    onChange={(e) => setFormData(prev => ({ ...prev, center_lng: e.target.value }))}
                                    placeholder="-77.0428"
                                    disabled={isLoading}
                                    helperText="Rango: -180 a 180"
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Tags */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Tags
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="Nuevo tag"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading}
                                size="small"
                            />
                            <Button
                                variant="outlined"
                                onClick={addTag}
                                disabled={!newTag.trim() || isLoading}
                                sx={{ minWidth: 'auto', px: 2 }}
                            >
                                <AddIcon />
                            </Button>
                        </Box>
                        {formData.tags.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {formData.tags.map((tag) => (
                                    <Chip
                                        key={tag}
                                        label={tag}
                                        onDelete={() => removeTag(tag)}
                                        deleteIcon={<DeleteIcon />}
                                        disabled={isLoading}
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        )}
                    </Box>

                    {/* Metadatos existentes (solo lectura) */}
                    {image.metadata && Object.keys(image.metadata).length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Metadatos EXIF
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                                <Typography
                                    component="pre"
                                    variant="body2"
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: 1.4,
                                        color: 'text.secondary'
                                    }}
                                >
                                    {JSON.stringify(image.metadata, null, 2)}
                                </Typography>
                            </Paper>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={onClose} disabled={isLoading}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isLoading}
                    startIcon={<SaveIcon />}
                    sx={{ ml: 1 }}
                >
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};