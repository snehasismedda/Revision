import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { filesApi } from '../api/index.js';
import toast from 'react-hot-toast';

const FileContext = createContext(null);

export const FileProvider = ({ children }) => {
    const [fileCache, setFileCache] = useState({}); // { [fileId]: fullFileData }
    const [isFetching, setIsFetching] = useState({}); // Tracking concurrent fetches for same file
    
    // Fetch full file data (including base64) on demand
    const getFileData = useCallback(async (subjectId, fileId) => {
        // Return from cache if available
        if (fileCache[fileId]) return fileCache[fileId];
        
        // Return existing promise if already fetching
        if (isFetching[fileId]) return isFetching[fileId];
        
        const fetchPromise = (async () => {
            try {
                const res = await filesApi.getById(subjectId, fileId);
                const fullFile = res.file;
                
                setFileCache(prev => ({
                    ...prev,
                    [fileId]: fullFile
                }));
                
                return fullFile;
            } catch (error) {
                console.error(`Failed to fetch file ${fileId}:`, error);
                toast.error('Failed to load file content');
                throw error;
            } finally {
                setIsFetching(prev => {
                    const next = { ...prev };
                    delete next[fileId];
                    return next;
                });
            }
        })();
        
        setIsFetching(prev => ({
            ...prev,
            [fileId]: fetchPromise
        }));
        
        return fetchPromise;
    }, [fileCache, isFetching]);

    // Clear specific file from cache if needed
    const clearFileCache = useCallback((fileId) => {
        setFileCache(prev => {
            const next = { ...prev };
            delete next[fileId];
            return next;
        });
    }, []);

    // Function to clear all cache (e.g. on logout)
    const clearAllCache = useCallback(() => {
        setFileCache({});
        setIsFetching({});
    }, []);

    return (
        <FileContext.Provider value={{ 
            getFileData,
            clearFileCache,
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
