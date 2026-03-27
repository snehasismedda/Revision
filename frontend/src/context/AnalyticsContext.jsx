import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { analyticsApi } from '../api';
import { useAuth } from './AuthContext';

const AnalyticsContext = createContext();

export const useAnalytics = () => {
    const context = useContext(AnalyticsContext);
    if (!context) {
        throw new Error('useAnalytics must be used within an AnalyticsProvider');
    }
    return context;
};

export const AnalyticsProvider = ({ children }) => {
    const { user } = useAuth();
    const [activityMap, setActivityMap] = useState({});
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [lastFetched, setLastFetched] = useState(null);

    const loadActivityMap = useCallback(async (months = 6, force = false) => {
        // Only fetch if not already fetched within last 5 minutes, or if forced
        const now = Date.now();
        if (!force && lastFetched && (now - lastFetched < 60 * 60 * 1000)) {
            return;
        }

        setLoadingActivity(true);
        try {
            const { activityMap: data } = await analyticsApi.activityMap(months);
            const map = {};
            data.forEach(entry => {
                // Convert UTC date to local (IST) date string
                const d = new Date(entry.date);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${day}`;
                map[dateStr] = entry;
            });
            setActivityMap(map);
            setLastFetched(now);
        } catch (err) {
            console.error('[AnalyticsContext] Failed to load activity map:', err);
        } finally {
            setLoadingActivity(false);
        }
    }, [lastFetched]);

    // Clear data on logout
    useEffect(() => {
        if (!user) {
            setActivityMap({});
            setLastFetched(null);
        }
    }, [user]);

    const value = {
        activityMap,
        loadingActivity,
        loadActivityMap,
        refreshActivityMap: () => loadActivityMap(6, true)
    };

    return (
        <AnalyticsContext.Provider value={value}>
            {children}
        </AnalyticsContext.Provider>
    );
};
