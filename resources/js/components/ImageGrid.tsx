import React, { useState } from 'react';
import {
    Box,
    TextField,
    InputAdornment,
    Button,
    Card,
    CardContent,
    Typography,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Chip,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput,
    Checkbox,
    CircularProgress,
    Paper
} from '@mui/material';
import { 
    Search as SearchIcon,
    Download as DownloadIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    MoreVert as MoreVertIcon,
    Visibility as VisibilityIcon,
    LocationOn as LocationIcon,
    CalendarToday as CalendarIcon,
    Image as ImageIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { WorkspaceImage } from '@/types/workspace';
import { imageApi } from '@/services/imageApi';
import { imageCacheService } from '@/services/imageCacheService';

// Componente para manejar la imagen con retry
const ImageWithRetry: React.FC<{
    workspaceId: string;
    imageId: string;
    alt: string;
    onImageSelect?: () => void;
    fallbackInfo: { type: string; size: string; };
    thumbUrl?: string | null;
}> = ({ workspaceId, imageId, alt, onImageSelect, fallbackInfo, thumbUrl = null }) => {
    const [loadError, setLoadError] = useState(false);
    const [, setRetryCount] = useState(() => 
        imageCacheService.getRetryCount(imageId, workspaceId)
    );
    const [isLoading, setIsLoading] = useState(true);
    const [imageUrl, setImageUrl] = useState(() => {
        // Prefer cached thumb url if present
        const cachedThumb = thumbUrl ? imageCacheService.getCachedUrl(imageId, workspaceId + '-thumb') : null;
        if (cachedThumb) return cachedThumb;
        if (thumbUrl) return imageCacheService.cacheUrl(imageId, workspaceId, 0, thumbUrl);
        return imageCacheService.getCachedUrl(imageId, workspaceId) || imageCacheService.cacheUrl(imageId, workspaceId);
    });

    const handleError = () => {
        console.log('Image load error for:', imageId, imageUrl);
        if (imageCacheService.shouldRetry(imageId, workspaceId)) {
            const newRetryCount = imageCacheService.incrementRetry(imageId, workspaceId);
            
            setTimeout(() => {
                setRetryCount(newRetryCount);
                setLoadError(false);
                setIsLoading(true);
                const newUrl = thumbUrl
                    ? imageCacheService.cacheUrl(imageId, workspaceId, newRetryCount, thumbUrl)
                    : imageCacheService.cacheUrl(imageId, workspaceId, newRetryCount);
                setImageUrl(newUrl);
            }, 1000 * newRetryCount);
        } else {
            setLoadError(true);
            setIsLoading(false);
        }
    };

    const handleLoad = () => {
        console.log('Image loaded successfully for:', imageId, imageUrl);
        setIsLoading(false);
        setLoadError(false);
    };

    const retryLoad = () => {
        imageCacheService.clearCache(imageId, workspaceId);
        setRetryCount(0);
        setLoadError(false);
        setIsLoading(true);
        const newUrl = thumbUrl
            ? imageCacheService.cacheUrl(imageId, workspaceId, 0, thumbUrl)
            : imageCacheService.cacheUrl(imageId, workspaceId, 0);
        setImageUrl(newUrl);
    };

    if (loadError) {
        return (
            <Box sx={{ 
                position: 'absolute', 
                inset: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'grey.100'
            }}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                    <ImageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {fallbackInfo.type.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        {fallbackInfo.size}
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={retryLoad}
                        sx={{ fontSize: '0.75rem' }}
                    >
                        Reintentar
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            <Box
                component="img"
                src={imageUrl}
                alt={alt}
                onError={handleError}
                onLoad={handleLoad}
                sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    bgcolor: 'white',
                    transition: 'transform 0.2s',
                    '&:hover': {
                        transform: 'scale(1.05)'
                    }
                }}
            />
            
            {/* Loading overlay */}
            {isLoading && (
                <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(255, 255, 255, 0.9)'
                }}>
                    <CircularProgress size={32} />
                </Box>
            )}
            
            {/* Hover overlay */}
            {!isLoading && !loadError && onImageSelect && (
                <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'all 0.2s',
                    '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.2)',
                        opacity: 1
                    }
                }}>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={onImageSelect}
                        sx={{ color: 'white', bgcolor: 'rgba(0, 0, 0, 0.7)' }}
                    >
                        Ver
                    </Button>
                </Box>
            )}
        </Box>
    );
};

interface ImageGridProps {
    workspaceId: string;
    images: WorkspaceImage[];
    onImageSelect?: (image: WorkspaceImage) => void;
    onImageEdit?: (image: WorkspaceImage) => void;
    onImageRename?: (image: WorkspaceImage) => void;
    onImageDelete?: (image: WorkspaceImage) => void;
    onRefresh: () => void;
}

export const ImageGrid: React.FC<ImageGridProps> = ({
    workspaceId,
    images,
    onImageSelect,
    onImageEdit,
    onImageDelete
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedImage, setSelectedImage] = useState<WorkspaceImage | null>(null);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, image: WorkspaceImage) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setSelectedImage(image);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedImage(null);
    };

    const handleDownload = async (image: WorkspaceImage) => {
        handleMenuClose();
        try {
            await imageApi.downloadImage(workspaceId, image.id);
        } catch (error) {
            console.error('Error downloading image:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredImages = images.filter(image => {
        const matchesSearch = !searchTerm || 
            image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            image.original_name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesTags = selectedTags.length === 0 || 
            selectedTags.some(tag => image.tags.includes(tag));
        
        return matchesSearch && matchesTags;
    });

    const allTags = Array.from(new Set(images.flatMap(img => img.tags))).sort();

    return (
        <Box sx={{ py: 3 }}>
            {/* Filtros y búsqueda */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder="Buscar por nombre o archivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
                
                {/* Filtro por tags */}
                {allTags.length > 0 && (
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Tags</InputLabel>
                        <Select
                            multiple
                            value={selectedTags}
                            onChange={(e) => setSelectedTags(e.target.value as string[])}
                            input={<OutlinedInput label="Tags" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={value} size="small" />
                                    ))}
                                </Box>
                            )}
                        >
                            {allTags.map((tag) => (
                                <MenuItem key={tag} value={tag}>
                                    <Checkbox checked={selectedTags.indexOf(tag) > -1} />
                                    <ListItemText primary={tag} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </Box>

            {/* Tags seleccionados */}
            {selectedTags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                    {selectedTags.map(tag => (
                        <Chip 
                            key={tag} 
                            label={tag}
                            onDelete={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                            size="small"
                        />
                    ))}
                    <Button 
                        variant="text" 
                        size="small" 
                        onClick={() => setSelectedTags([])}
                    >
                        Limpiar filtros
                    </Button>
                </Box>
            )}

            {/* Grid de imágenes */}
            {filteredImages.length === 0 ? (
                <Paper sx={{ textAlign: 'center', py: 6, px: 3 }}>
                    <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        {images.length === 0 ? 'No hay imágenes' : 'No se encontraron imágenes'}
                    </Typography>
                    <Typography color="text.secondary">
                        {images.length === 0 
                            ? 'Sube tu primera imagen satelital para comenzar.'
                            : 'Intenta con otros términos de búsqueda o tags.'
                        }
                    </Typography>
                </Paper>
            ) : (
                <Box sx={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 3,
                    '& > *': {
                        flexBasis: {
                            xs: '100%',
                            sm: 'calc(50% - 12px)',
                            lg: 'calc(33.333% - 16px)'
                        },
                        flexGrow: 0,
                        flexShrink: 0
                    }
                }}>
                    {filteredImages.map((image) => (
                        <Card key={image.id} sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            transition: 'all 0.2s',
                            '&:hover': {
                                boxShadow: 6,
                                transform: 'translateY(-2px)'
                            }
                        }}>
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'flex-start',
                                p: 2,
                                pb: 1,
                                gap: 1
                            }}>
                                <Box sx={{ 
                                    flex: 1, 
                                    minWidth: 0, // Permite que el texto se trunque
                                    pr: 1 
                                }}>
                                    <Typography 
                                        variant="h6" 
                                        noWrap 
                                        title={image.name}
                                        sx={{ 
                                            fontWeight: 600,
                                            lineHeight: 1.2,
                                            mb: 0.5 
                                        }}
                                    >
                                        {image.name}
                                    </Typography>
                                    <Typography 
                                        variant="body2" 
                                        color="text.secondary" 
                                        noWrap 
                                        title={image.original_name}
                                        sx={{ lineHeight: 1.2 }}
                                    >
                                        {image.original_name}
                                    </Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={(e) => handleMenuClick(e, image)}
                                    sx={{ 
                                        flexShrink: 0, // Nunca se encoge
                                        ml: 1 
                                    }}
                                >
                                    <MoreVertIcon />
                                </IconButton>
                            </Box>
                            
                            <CardContent sx={{ flexGrow: 1, pt: 0 }}>
                                {/* Vista previa de la imagen */}
                                <Box sx={{ 
                                    position: 'relative',
                                    width: '100%',
                                    paddingTop: '56.25%', // 16:9 aspect ratio
                                    mb: 2,
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    bgcolor: 'grey.100'
                                }}>
                                    <Box sx={{ position: 'absolute', inset: 0 }}>
                                        <ImageWithRetry
                                            workspaceId={workspaceId}
                                            imageId={image.id}
                                            alt={image.name}
                                            onImageSelect={() => onImageSelect?.(image)}
                                            thumbUrl={image.thumbnail_url || null}
                                            fallbackInfo={{
                                                type: image.mime_type.split('/')[1],
                                                size: image.formatted_size
                                            }}
                                        />
                                    </Box>
                                </Box>

                                {/* Metadatos */}
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {formatDate(image.created_at)}
                                        </Typography>
                                    </Box>
                                    
                                    {image.coordinates?.center && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" color="text.secondary">
                                                {image.coordinates.center.lat.toFixed(4)}, {image.coordinates.center.lng.toFixed(4)}
                                            </Typography>
                                        </Box>
                                    )}

                                    <Typography variant="caption" color="text.secondary">
                                        Por: {image.uploaded_by.name}
                                    </Typography>
                                </Box>

                                {/* Tags */}
                                {image.tags && image.tags.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {image.tags.slice(0, 3).map(tag => (
                                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                                        ))}
                                        {image.tags.length > 3 && (
                                            <Chip 
                                                label={`+${image.tags.length - 3}`} 
                                                size="small" 
                                                variant="outlined" 
                                            />
                                        )}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}

            {/* Menú contextual */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem onClick={() => {
                    handleMenuClose();
                    onImageSelect?.(selectedImage!);
                }}>
                    <ListItemIcon>
                        <VisibilityIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Ver detalles</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={() => handleDownload(selectedImage!)}>
                    <ListItemIcon>
                        <DownloadIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Descargar</ListItemText>
                </MenuItem>
                
                {selectedImage?.can_edit && (
                    <>                       
                        <MenuItem onClick={() => {
                            handleMenuClose();
                            onImageEdit?.(selectedImage!);
                        }}>
                            <ListItemIcon>
                                <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Editar</ListItemText>
                        </MenuItem>
                    </>
                )}
                
                {selectedImage?.can_delete && (
                    <MenuItem 
                        onClick={() => {
                            handleMenuClose();
                            onImageDelete?.(selectedImage!);
                        }}
                        sx={{ color: 'error.main' }}
                    >
                        <ListItemIcon>
                            <DeleteIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText>Eliminar</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </Box>
    );
};