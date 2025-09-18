class ImageCacheService {
    private cache = new Map<string, { url: string; timestamp: number; retries: number }>();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    private readonly MAX_RETRIES = 3;

    getCachedUrl(imageId: string, workspaceId: string): string | null {
        const key = `${workspaceId}-${imageId}`;
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.url;
        }
        
        return null;
    }

    /**
     * Cache a URL for an image. If baseUrl is provided, use it instead of constructing the default download preview URL.
     */
    cacheUrl(imageId: string, workspaceId: string, retryCount: number = 0, baseUrl?: string): string {
        const key = `${workspaceId}-${imageId}${baseUrl ? '-thumb' : ''}`;
        const timestamp = Date.now();
        let url: string;

        if (baseUrl) {
            // Append timestamp and retry params safely
            url = baseUrl + (baseUrl.includes('?') ? `&t=${timestamp}` : `?t=${timestamp}`) + (retryCount > 0 ? `&retry=${retryCount}` : '');
        } else {
            url = `/api/workspaces/${workspaceId}/images/${imageId}/download?preview=true&t=${timestamp}${retryCount > 0 ? `&retry=${retryCount}` : ''}`;
        }

        this.cache.set(key, {
            url,
            timestamp,
            retries: retryCount
        });

        return url;
    }

    shouldRetry(imageId: string, workspaceId: string): boolean {
           const key = `${workspaceId}-${imageId}`;
        const cached = this.cache.get(key);
        
        return !cached || cached.retries < this.MAX_RETRIES;
    }

    getRetryCount(imageId: string, workspaceId: string): number {
        const key = `${workspaceId}-${imageId}`;
        const cached = this.cache.get(key);
        
        return cached ? cached.retries : 0;
    }

    incrementRetry(imageId: string, workspaceId: string): number {
        const key = `${workspaceId}-${imageId}`;
        const cached = this.cache.get(key);
        const newRetryCount = cached ? cached.retries + 1 : 1;
        
        return newRetryCount;
    }

    clearCache(imageId?: string, workspaceId?: string) {
        if (imageId && workspaceId) {
            const key = `${workspaceId}-${imageId}`;
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    // Limpiar cache antigua automáticamente
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.CACHE_DURATION * 2) {
                this.cache.delete(key);
            }
        }
    }
}

export const imageCacheService = new ImageCacheService();

// Limpiar cache cada 10 minutos
setInterval(() => {
    imageCacheService.cleanup();
}, 10 * 60 * 1000);