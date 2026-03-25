import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import * as testSeriesApi from '../api/testSeriesApi.js';
import { useAuth } from './AuthContext.jsx';
import toast from 'react-hot-toast';

const TestSeriesContext = createContext(null);

export const TestSeriesProvider = ({ children }) => {
    const { user } = useAuth();
    const [testSeries, setTestSeries] = useState([]);
    const [seriesDetails, setSeriesDetails] = useState({});
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);
    const isLoadedRef = useRef(false);
    const loadingPromiseRef = useRef(null);
    const detailingPromisesRef = useRef({}); // seriesId -> promise

    // Reset when user logs out
    useEffect(() => {
        if (!user) {
            setTestSeries([]);
            setSeriesDetails({});
            setIsLoaded(false);
            isLoadedRef.current = false;
        }
    }, [user]);

    const loadTestSeries = useCallback(async (force = false) => {
        if (isLoadedRef.current && !force) return;
        if (loadingPromiseRef.current && !force) return loadingPromiseRef.current;
        
        const load = async () => {
            setLoading(true);
            try {
                const data = await testSeriesApi.getTestSeries();
                setTestSeries(data.testSeries || []);
                setIsLoaded(true);
                isLoadedRef.current = true;
            } catch (error) {
                console.error('Failed to load test series:', error);
                toast.error('Failed to load test series');
            } finally {
                setLoading(false);
                loadingPromiseRef.current = null;
            }
        };

        loadingPromiseRef.current = load();
        return loadingPromiseRef.current;
    }, []);

    const loadSeriesDetail = useCallback(async (seriesId, force = false) => {
        if (seriesDetails[seriesId] && !force) return;
        if (detailingPromisesRef.current[seriesId] && !force) return detailingPromisesRef.current[seriesId];

        const load = async () => {
            setDetailLoading(prev => ({ ...prev, [seriesId]: true }));
            try {
                const res = await testSeriesApi.getTestSeriesDetail(seriesId);
                setSeriesDetails(prev => ({
                    ...prev,
                    [seriesId]: { series: res.series, tests: res.tests || [] }
                }));
                return res;
            } catch (error) {
                console.error('Failed to load series detail:', error);
                toast.error('Failed to load series details');
            } finally {
                setDetailLoading(prev => ({ ...prev, [seriesId]: false }));
                delete detailingPromisesRef.current[seriesId];
            }
        };

        detailingPromisesRef.current[seriesId] = load();
        return detailingPromisesRef.current[seriesId];
    }, [seriesDetails]);

    const addSeries = useCallback(async (seriesData) => {
        const loadingToast = toast.loading('Creating test series...');
        try {
            const { series } = await testSeriesApi.createTestSeries(seriesData);
            setTestSeries(prev => [series, ...prev]);
            toast.success('Test series created!', { id: loadingToast });
            return series;
        } catch (error) {
            console.error('Failed to add series:', error);
            toast.error('Failed to create series', { id: loadingToast });
            throw error;
        }
    }, []);

    const updateSeries = useCallback(async (id, seriesData) => {
        const loadingToast = toast.loading('Updating test series...');
        try {
            const { series } = await testSeriesApi.updateTestSeries(id, seriesData);
            setTestSeries(prev => prev.map(s => s.id === id ? series : s));
            setSeriesDetails(prev => {
                if (!prev[id]) return prev;
                return {
                    ...prev,
                    [id]: { ...prev[id], series: series }
                };
            });
            toast.success('Test series updated!', { id: loadingToast });
            return series;
        } catch (error) {
            console.error('Failed to update series:', error);
            toast.error('Failed to update series', { id: loadingToast });
            throw error;
        }
    }, []);

    const deleteSeries = useCallback(async (id, name) => {
        const loadingToast = toast.loading(`Deleting ${name || 'series'}...`);
        try {
            await testSeriesApi.deleteTestSeries(id);
            setTestSeries(prev => prev.filter(s => s.id !== id));
            setSeriesDetails(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            toast.success(`${name || 'Series'} deleted`, { id: loadingToast });
        } catch (error) {
            console.error('Failed to delete series:', error);
            toast.error('Failed to delete series', { id: loadingToast });
            throw error;
        }
    }, []);

    const updateTestsInSeries = useCallback((seriesId, tests) => {
        setSeriesDetails(prev => {
            if (!prev[seriesId]) return prev;
            return {
                ...prev,
                [seriesId]: { ...prev[seriesId], tests }
            };
        });
    }, []);

    return (
        <TestSeriesContext.Provider value={{ 
            testSeries, 
            seriesDetails,
            loading, 
            detailLoading,
            isLoaded, 
            loadTestSeries, 
            loadSeriesDetail,
            addSeries, 
            updateSeries, 
            deleteSeries,
            updateTestsInSeries
        }}>
            {children}
        </TestSeriesContext.Provider>
    );
};

export const useTestSeries = () => {
    const ctx = useContext(TestSeriesContext);
    if (!ctx) throw new Error('useTestSeries must be used within TestSeriesProvider');
    return ctx;
};
