import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { foldersApi } from '../api/index.js';
import toast from 'react-hot-toast';

const FolderContext = createContext(null);

export const FolderProvider = ({ children }) => {
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const lastFetchedScope = useRef(null); // { id, type }

    const fetchFolders = useCallback(async (scopeId, scopeType, force = false, parentId = undefined) => {
        if (!scopeId) return;
        
        // If parentId is provided, we are fetching subfolders. 
        // We should skip if we already have folders with this parent_id (optional optimization)
        
        setLoading(true);
        try {
            const subjectId = scopeType === 'subject' ? scopeId : null;
            const testSeriesId = scopeType === 'series' ? scopeId : null;
            const res = await foldersApi.list(subjectId, testSeriesId, parentId);
            const fetched = res.folders || [];
            
            setFolders(prev => {
                // Merge without duplicates
                const existingIds = new Set(prev.map(f => f.id));
                const newOnes = fetched.filter(f => !existingIds.has(f.id));
                return [...prev, ...newOnes];
            });
            
            lastFetchedScope.current = { id: String(scopeId), type: scopeType };
        } catch (error) {
            console.error('Failed to fetch folders:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFolderContents = useCallback(async (scopeId, scopeType, folderId = null, limit = 50, offset = 0) => {
        if (!scopeId) return { folders: [], files: [] };
        
        setLoading(true);
        try {
            const subjectId = scopeType === 'subject' ? scopeId : null;
            const testSeriesId = scopeType === 'series' ? scopeId : null;
            const res = await foldersApi.getContents(subjectId, testSeriesId, folderId, limit, offset);
            
            const fetchedFolders = res.folders || [];
            const fetchedFiles = res.files || [];
            
            setFolders(prev => {
                const existingIds = new Set(prev.map(f => f.id));
                const newOnes = fetchedFolders.filter(f => !existingIds.has(f.id));
                return [...prev, ...newOnes];
            });
            
            return { folders: fetchedFolders, files: fetchedFiles };
        } catch (error) {
            console.error('Failed to fetch folder contents:', error);
            return { folders: [], files: [] };
        } finally {
            setLoading(false);
        }
    }, []);

    const clearFolders = useCallback(() => {
        setFolders([]);
        lastFetchedScope.current = null;
    }, []);

    const updateFolderInList = useCallback((updatedFolder) => {
        setFolders(prev => prev.map(f => f.id === updatedFolder.id ? updatedFolder : f));
    }, []);

    const addFolderToList = useCallback((newFolder) => {
        setFolders(prev => [...prev, newFolder]);
    }, []);

    const removeFolderFromList = useCallback((folderId) => {
        setFolders(prev => prev.filter(f => String(f.id) !== String(folderId)));
    }, []);

    return (
        <FolderContext.Provider value={{
            folders,
            loading,
            fetchFolders,
            fetchFolderContents,
            setFolders,
            clearFolders,
            updateFolderInList,
            addFolderToList,
            removeFolderFromList
        }}>
            {children}
        </FolderContext.Provider>
    );
};

export const useFolders = () => {
    const ctx = useContext(FolderContext);
    if (!ctx) throw new Error('useFolders must be used within FolderProvider');
    return ctx;
};
