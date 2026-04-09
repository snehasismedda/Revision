import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { filesApi } from '../api/index.js';
import toast from 'react-hot-toast';

const FileContext = createContext(null);

const CACHE_TTL = 5 * 60 * 1000; // 5 Minutes
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100 MB

const estimateSize = (obj) => {
    try {
        const str = JSON.stringify(obj);
        return str ? str.length : 0;
    } catch {
        return 0;
    }
};

export const FileProvider = ({ children }) => {
    const [fileCache, setFileCache] = useState({});
    const cacheRef = useRef({}); // For synchronous reads without dependency loops
    const fetchingRegistry = useRef({});

    // Keep Ref in sync with state for immediate lookups in callbacks
    useEffect(() => {
        cacheRef.current = fileCache;
    }, [fileCache]);

    const getFileData = useCallback(async (subjectId, fileId) => {
        const now = Date.now();
        
        // 1. Check if valid cache exists (using Ref for stability)
        const cached = cacheRef.current[fileId];
        if (cached && (now - cached.timestamp < CACHE_TTL)) {
            return cached.data;
        }

        // 2. Immediate deduplication
        if (fetchingRegistry.current[fileId]) {
            return fetchingRegistry.current[fileId];
        }

        const fetchPromise = (async () => {
            try {
                const res = await filesApi.getById(subjectId, fileId);
                const fullFile = res.file;
                const size = estimateSize(fullFile);

                setFileCache(prev => {
                    const next = { ...prev };
                    delete next[fileId];

                    let currentTotalSize = Object.values(next).reduce((acc, item) => acc + (item.size || 0), 0);
                    
                    if (currentTotalSize + size > MAX_CACHE_SIZE) {
                        const entries = Object.entries(next).sort((a, b) => a[1].timestamp - b[1].timestamp);
                        while (currentTotalSize + size > MAX_CACHE_SIZE && entries.length > 0) {
                            const [oldId, oldItem] = entries.shift();
                            currentTotalSize -= oldItem.size || 0;
                            delete next[oldId];
                        }
                    }

                    next[fileId] = {
                        data: fullFile,
                        timestamp: Date.now(),
                        size
                    };
                    return next;
                });

                return fullFile;
            } catch (error) {
                console.error(`Failed to fetch file ${fileId}:`, error);
                toast.error('Failed to load file content');
                throw error;
            } finally {
                delete fetchingRegistry.current[fileId];
            }
        })();

        fetchingRegistry.current[fileId] = fetchPromise;
        return fetchPromise;
    }, []); // No longer depends on fileCache state!

    const clearFileCache = useCallback((fileId) => {
        setFileCache(prev => {
            const next = { ...prev };
            delete next[fileId];
            return next;
        });
    }, []);

    const clearFileCacheMany = useCallback((fileIds) => {
        if (!fileIds || fileIds.length === 0) return;
        setFileCache(prev => {
            const next = { ...prev };
            fileIds.forEach(id => delete next[id]);
            return next;
        });
        fileIds.forEach(id => delete fetchingRegistry.current[id]);
    }, []);

    const clearAllCache = useCallback(() => {
        setFileCache({});
        cacheRef.current = {};
        fetchingRegistry.current = {};
    }, []);

    return (
        <FileContext.Provider value={{
            getFileData,
            clearFileCache,
            clearFileCacheMany,
            clearAllCache,
            fileCache
        }}>
            {children}
        </FileContext.Provider>
    );
};

export const useFiles = () => {
    const ctx = useContext(FileContext);
    if (!ctx) throw new Error('useFiles must be used within FileProvider');
    return ctx;
};
