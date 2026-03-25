import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { topicsApi } from '../api/index.js';
import { useAuth } from './AuthContext.jsx';
import toast from 'react-hot-toast';

const TopicContext = createContext(null);

export const TopicProvider = ({ children }) => {
    const { user } = useAuth();
    const [topicsBySubject, setTopicsBySubject] = useState({});
    const [loading, setLoading] = useState({});
    const subjectsLoadedRef = useRef({});
    const loadingPromisesRef = useRef({}); // subjectId -> promise
    // const isLoadedRefs = useRef({}); // subjectId -> boolean // This line is commented out as per the implied change

    // Reset when user logs out
    useEffect(() => {
        if (!user) {
            setTopicsBySubject({});
            setLoading({});
            // loadingRefs.current = {}; // This line is removed as per the implied change
            // isLoadedRefs.current = {}; // This line is removed as per the implied change
            subjectsLoadedRef.current = {};
            loadingPromisesRef.current = {};
        }
    }, [user]);

    const loadTopics = useCallback(async (subjectId, force = false) => {
        if (!subjectId) return;
        if (subjectsLoadedRef.current[subjectId] && !force) return;
        if (loadingPromisesRef.current[subjectId] && !force) return loadingPromisesRef.current[subjectId];
        
        const load = async () => {
            setLoading(prev => ({ ...prev, [subjectId]: true }));
            try {
                const { topics } = await topicsApi.list(subjectId);
                setTopicsBySubject(prev => ({
                    ...prev,
                    [subjectId]: topics || []
                }));
                subjectsLoadedRef.current[subjectId] = true;
            } catch (error) {
                console.error(`Failed to load topics for subject ${subjectId}:`, error);
                toast.error('Failed to load curriculum');
            } finally {
                setLoading(prev => ({ ...prev, [subjectId]: false }));
                delete loadingPromisesRef.current[subjectId];
            }
        };

        loadingPromisesRef.current[subjectId] = load();
        return loadingPromisesRef.current[subjectId];
    }, []);

    const addTopic = useCallback(async (subjectId, topicData) => {
        const loadingToast = toast.loading('Adding topic...');
        try {
            const { topic } = await topicsApi.create(subjectId, topicData);
            const created = { ...topic, children: [] };
            
            if (topicData.parentId) {
                // It's a subtopic
                setTopicsBySubject(prev => {
                    const current = prev[subjectId] || [];
                    const addChild = (nodes) =>
                        nodes.map((n) =>
                            n.id === topicData.parentId
                                ? { ...n, children: [...(n.children || []), created] }
                                : { ...n, children: addChild(n.children || []) }
                        );
                    return { ...prev, [subjectId]: addChild(current) };
                });
            } else {
                // It's a root topic
                setTopicsBySubject(prev => ({
                    ...prev,
                    [subjectId]: [created, ...(prev[subjectId] || [])]
                }));
            }
            toast.success('Topic added successfully!', { id: loadingToast });
            return created;
        } catch (error) {
            console.error('Failed to add topic:', error);
            toast.error(error.message || 'Failed to add topic', { id: loadingToast });
            throw error;
        }
    }, []);

    const updateTopic = useCallback(async (subjectId, topicId, updatedData) => {
        const loadingToast = toast.loading('Updating topic...');
        try {
            const { topic } = await topicsApi.update(subjectId, topicId, updatedData);
            setTopicsBySubject(prev => {
                const current = prev[subjectId] || [];
                const updateInTree = (nodes) =>
                    nodes.map((n) =>
                        n.id === topicId
                            ? { ...n, ...topic }
                            : { ...n, children: updateInTree(n.children || []) }
                    );
                return { ...prev, [subjectId]: updateInTree(current) };
            });
            toast.success('Topic updated successfully!', { id: loadingToast });
            return topic;
        } catch (error) {
            console.error('Failed to update topic:', error);
            toast.error(error.message || 'Failed to update topic', { id: loadingToast });
            throw error;
        }
    }, []);

    const deleteTopic = useCallback(async (subjectId, topicId) => {
        const loadingToast = toast.loading('Deleting topic...');
        try {
            await topicsApi.delete(subjectId, topicId);
            setTopicsBySubject(prev => {
                const current = prev[subjectId] || [];
                const removeFromTree = (nodes) =>
                    nodes
                        .filter((n) => n.id !== topicId)
                        .map((n) => ({ ...n, children: removeFromTree(n.children || []) }));
                return { ...prev, [subjectId]: removeFromTree(current) };
            });
            toast.success('Topic removed successfully!', { id: loadingToast });
        } catch (error) {
            console.error('Failed to delete topic:', error);
            toast.error('Failed to delete topic', { id: loadingToast });
            throw error;
        }
    }, []);

    const bulkCreateTopics = useCallback(async (subjectId, topicsData) => {
        try {
            await topicsApi.bulkCreate(subjectId, topicsData);
            await loadTopics(subjectId, true);
        } catch (error) {
            console.error('Failed to bulk create topics:', error);
            throw error;
        }
    }, [loadTopics]);

    return (
        <TopicContext.Provider value={{ 
            topicsBySubject, 
            loading, 
            loadTopics, 
            addTopic, 
            updateTopic, 
            deleteTopic,
            bulkCreateTopics
        }}>
            {children}
        </TopicContext.Provider>
    );
};

export const useTopics = () => {
    const ctx = useContext(TopicContext);
    if (!ctx) throw new Error('useTopics must be used within TopicProvider');
    return ctx;
};
