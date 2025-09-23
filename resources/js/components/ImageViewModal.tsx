import React, { useState } from 'react';
import { 
    Dialog, 
    DialogContent,
    DialogTitle,
    Box,
    Typography,
    Button,
    IconButton,
    Paper,
    Chip,
    Divider,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Close as CloseIcon,
    Download as DownloadIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CalendarToday as CalendarIcon,
    Person as PersonIcon,
    LocationOn as LocationIcon,
    ContentCopy as CopyIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { WorkspaceImage } from '@/types/workspace';
import { imageApi } from '@/services/imageApi';
import { workspaceApi } from '@/services/workspaceApi';

interface ImageViewModalProps {
    workspaceId: string;
    image: WorkspaceImage | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (image: WorkspaceImage) => void;
    onDelete?: (image: WorkspaceImage) => void;
}

export const ImageViewModal: React.FC<ImageViewModalProps> = ({
    workspaceId,
    image,
    isOpen,
    onClose,
    onEdit,
    onDelete
}) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Reset states when image changes
    React.useEffect(() => {
        if (image && isOpen) {
            setImageLoading(true);
            setImageError(false);
            setRetryCount(0);
        }
    }, [image, isOpen]);

    if (!image) return null;

    const handleDownload = async () => {
        try {
            await imageApi.downloadImage(workspaceId, image.id);
        } catch (error) {
            console.error('Error downloading image:', error);
            // Mostrar un mensaje de error al usuario
            alert('Error al descargar la imagen. Por favor, intenta de nuevo.');
        }
    };

    const handleImageLoad = () => {
        setImageLoading(false);
        setImageError(false);
    };

    const handleImageError = () => {
        if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
            setImageLoading(true);
            setImageError(false);
        } else {
            setImageError(true);
            setImageLoading(false);
        }
    };

    const retryImageLoad = () => {
        setRetryCount(0);
        setImageError(false);
        setImageLoading(true);
    };

    const handleCopyCoordinates = () => {
        if (image.coordinates?.center) {
            const coords = `${image.coordinates.center.lat.toFixed(6)}, ${image.coordinates.center.lng.toFixed(6)}`;
            navigator.clipboard.writeText(coords);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getImageUrl = () => {
        const baseUrl = `/api/workspaces/${workspaceId}/images/${image.id}/download?preview=true`;
        return retryCount > 0 ? `${baseUrl}&retry=${retryCount}` : baseUrl;
    };

    const isTiffFile = image.mime_type.includes('tiff') || image.mime_type.includes('tif');

    return (
        <Dialog 
            open={isOpen} 
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    height: '90vh',
                    maxHeight: '90vh',
                    m: 2,
                    zIndex: 1300
                }
            }}
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: 1,
                borderColor: 'divider',
                pb: 2
            }}>
                <Box>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                        {image.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {image.original_name}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownload}
                    >
                        Descargar
                    </Button>
                    {image.can_edit && (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => onEdit?.(image)}
                        >
                            Editar
                        </Button>
                    )}
                    {image.can_delete && (
                        <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => onDelete?.(image)}
                        >
                            Eliminar
                        </Button>
                    )}
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0, height: '100%', display: 'flex', overflow: 'hidden' }}>
                <Box sx={{ 
                    display: 'flex', 
                    height: '100%', 
                    width: '100%',
                    flexDirection: { xs: 'column', md: 'row' }
                }}>
                    {/* Área de imagen */}
                    <Box sx={{ 
                        flex: { xs: '1 1 60%', md: '1 1 66.666%' },
                        height: { xs: 'auto', md: '100%' },
                        minHeight: { xs: 400, md: 0 },
                        display: 'flex', 
                        flexDirection: 'column'
                    }}>
                        <Box sx={{ 
                            p: 3, 
                            height: '100%', 
                            bgcolor: 'grey.50',
                            overflow: 'auto',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <Paper 
                                elevation={2} 
                                sx={{ 
                                    height: '100%', 
                                    minHeight: 400,
                                    flex: 1,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {!imageError ? (
                                    <>
                                        {isTiffFile && (
                                            <Chip
                                                label="TIFF → JPEG Preview"
                                                color="primary"
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 16,
                                                    left: 16,
                                                    zIndex: 10
                                                }}
                                            />
                                        )}
                                        <Box
                                            component="img"
                                            src={getImageUrl()}
                                            alt={image.name}
                                            onLoad={handleImageLoad}
                                            onError={handleImageError}
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                p: 2,
                                                opacity: imageLoading ? 0 : 1,
                                                transition: 'opacity 0.3s'
                                            }}
                                        />
                                        
                                        {imageLoading && !imageError && (
                                            <Box sx={{
                                                position: 'absolute',
                                                inset: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'rgba(255, 255, 255, 0.8)'
                                            }}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <CircularProgress sx={{ mb: 2 }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {isTiffFile ? 'Convirtiendo TIFF...' : 'Cargando imagen...'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    </>
                                ) : (
                                    <Box sx={{ textAlign: 'center', p: 4 }}>
                                        <Alert severity="error" sx={{ mb: 2 }}>
                                            Error al cargar la imagen
                                        </Alert>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Formato: {image.mime_type}
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            startIcon={<RefreshIcon />}
                                            onClick={retryImageLoad}
                                        >
                                            Reintentar
                                        </Button>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    </Box>

                    {/* Panel de información */}
                    <Box sx={{ 
                        flex: { xs: '1 1 40%', md: '1 1 33.333%' },
                        height: { xs: 'auto', md: '100%' },
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                    }}>
                        <Box sx={{ 
                            p: 3, 
                            height: '100%', 
                            overflow: 'auto',
                            borderLeft: { xs: 0, md: 1 },
                            borderTop: { xs: 1, md: 0 },
                            borderColor: 'divider',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* Información básica */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Información
                                </Typography>
                                
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Archivo original:
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                                        {image.original_name}
                                    </Typography>
                                </Box>

                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Tamaño:
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        {image.formatted_size}
                                    </Typography>
                                </Box>

                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Tipo:
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {image.mime_type}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <CalendarIcon fontSize="small" color="action" />
                                    <Typography variant="body2">
                                        {formatDate(image.created_at)}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PersonIcon fontSize="small" color="action" />
                                    <Typography variant="body2">
                                        Subida por {image.uploaded_by.name}
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            {/* Descripción */}
                            {image.description && (
                                <>
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                            Descripción
                                        </Typography>
                                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                            {image.description}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ my: 3 }} />
                                </>
                            )}

                            {/* Coordenadas */}
                            {image.coordinates?.center && (
                                <>
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                            Ubicación
                                        </Typography>
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <LocationIcon fontSize="small" color="action" />
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                        {image.coordinates.center.lat.toFixed(6)}, {image.coordinates.center.lng.toFixed(6)}
                                                    </Typography>
                                                </Box>
                                                <IconButton size="small" onClick={handleCopyCoordinates}>
                                                    <CopyIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Paper>
                                    </Box>
                                    <Divider sx={{ my: 3 }} />
                                </>
                            )}

                            {/* Tags */}
                            {image.tags.length > 0 && (
                                <>
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                            Tags
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {image.tags.map(tag => (
                                                <Chip
                                                    key={tag}
                                                    label={tag}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                    <Divider sx={{ my: 3 }} />
                                </>
                            )}

                            {/* Metadatos técnicos */}
                            {image.metadata && Object.keys(image.metadata).length > 0 && (
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                        Metadatos
                                    </Typography>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                            <Typography 
                                                component="pre" 
                                                variant="body2" 
                                                sx={{ 
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'pre-wrap',
                                                    lineHeight: 1.4
                                                }}
                                            >
                                                {JSON.stringify(image.metadata, null, 2)}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
};