import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { subjectsApi, analyticsApi } from '../api/index.js';
import { useAuth } from './AuthContext.jsx';
import toast from 'react-hot-toast';

const SubjectContext = createContext(null);

export const SubjectProvider = ({ children }) => {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [statsMap, setStatsMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const isLoadedRef = useRef(false);
    const loadingPromiseRef = useRef(null);

    // Reset state when user changes/logs out
    useEffect(() => {
        if (!user) {
            setSubjects([]);
            setStatsMap({});
            setIsLoaded(false);
            isLoadedRef.current = false;
        }
    }, [user]);

    const loadSubjects = useCallback(async (force = false) => {
        if (isLoadedRef.current && !force) return;
        if (loadingPromiseRef.current && !force) return loadingPromiseRef.current;
        
        const load = async () => {
            setLoading(true);
            try {
                const { subjects: subs } = await subjectsApi.list();
                setSubjects(subs);
                setIsLoaded(true);
                isLoadedRef.current = true;

                if (subs.length > 0) {
                    const data = await analyticsApi.overview(subs.map(s => s.id));
                    setStatsMap(data.overviews || {});
                }
            } catch (error) {
                console.error('Failed to load subjects:', error);
                toast.error('Failed to load subjects');
            } finally {
                setLoading(false);
                loadingPromiseRef.current = null;
            }
        };

        loadingPromiseRef.current = load();
        return loadingPromiseRef.current;
    }, []);

    const refreshStats = useCallback(async (subjectIds) => {
        if (!subjectIds || subjectIds.length === 0) return;
        try {
            const data = await analyticsApi.overview(subjectIds);
            setStatsMap(prev => ({
                ...prev,
                ...(data.overviews || {})
            }));
        } catch (error) {
            console.error('Failed to refresh stats:', error);
        }
    }, []);

    const addSubject = useCallback(async (subjectData) => {
        const loadingToast = toast.loading('Creating subject...');
        try {
            const { subject } = await subjectsApi.create(subjectData);
            setSubjects(prev => [subject, ...prev]);
            refreshStats([subject.id]);
            toast.success('Subject created successfully!', { id: loadingToast });
            return subject;
        } catch (error) {
            console.error('Failed to add subject:', error);
            toast.error(error.message || 'Failed to create subject', { id: loadingToast });
            throw error;
        }
    }, [refreshStats]);

    const updateSubject = useCallback(async (id, subjectData) => {
        const loadingToast = toast.loading('Updating subject...');
        try {
            const { subject } = await subjectsApi.update(id, subjectData);
            setSubjects(prev => prev.map(s => s.id === id ? subject : s));
            toast.success('Subject updated successfully!', { id: loadingToast });
            return subject;
        } catch (error) {
            console.error('Failed to update subject:', error);
            toast.error(error.message || 'Failed to update subject', { id: loadingToast });
            throw error;
        }
    }, []);

    const deleteSubject = useCallback(async (id, name) => {
        const loadingToast = toast.loading(`Deleting ${name || 'subject'}...`);
        try {
            await subjectsApi.delete(id);
            setSubjects(prev => prev.filter(s => s.id !== id));
            setStatsMap(prev => {
                const newMap = { ...prev };
                delete newMap[id];
                return newMap;
            });
            toast.success(`${name || 'Subject'} deleted`, { id: loadingToast });
        } catch (error) {
            console.error('Failed to delete subject:', error);
            toast.error('Failed to delete subject', { id: loadingToast });
            throw error;
        }
    }, []);

    return (
        <SubjectContext.Provider value={{ 
            subjects, 
            statsMap, 
            loading, 
            isLoaded, 
            loadSubjects, 
            addSubject, 
            updateSubject, 
            deleteSubject,
            refreshStats
        }}>
            {children}
        </SubjectContext.Provider>
    );
};

export const useSubjects = () => { 
    const ctx = useContext(SubjectContext);
    if (!ctx) throw new Error('useSubjects must be used within SubjectProvider');
    return ctx;
}; 

