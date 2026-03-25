import * as analyticsModel from '../models/analyticsModel.js';

export const getOverview = async (req, res) => {
    try {
        let subjectIds = [];
        if (req.query.subjectIds) {
            subjectIds = req.query.subjectIds.split(',').filter(id => !!id.trim());
        } else if (req.params.subjectId) {
            subjectIds = [req.params.subjectId];
        }

        if (subjectIds.length === 0) {
            return res.status(400).json({ error: 'No subject IDs provided' });
        }

        const subjectsOverview = await analyticsModel.getSubjectsOverview(subjectIds);
        const formattedResult = {};

        for (const [id, overview] of Object.entries(subjectsOverview)) {
            const totalQuestions = parseInt(overview?.total_questions || 0);
            const totalCorrect = parseInt(overview?.total_correct || 0);
            const availableQuestions = parseInt(overview?.available_questions || 0);
            const totalSessions = parseInt(overview?.total_sessions || 0);
            const totalNotes = parseInt(overview?.total_notes || 0);
            const totalSolutions = parseInt(overview?.total_solutions || 0);
            const totalImages = parseInt(overview?.total_images || 0);

            const accuracy = totalQuestions > 0
                ? Math.round((totalCorrect / totalQuestions) * 100 * 10) / 10
                : null;

            formattedResult[id] = {
                totalQuestions,
                availableQuestions,
                totalCorrect,
                totalIncorrect: totalQuestions - totalCorrect,
                accuracy,
                totalSessions,
                totalNotes,
                totalSolutions,
                totalImages,
                topicsCovered: parseInt(overview?.topics_covered || 0),
                totalTopics: parseInt(overview?.total_topics || 0),
                totalRevisionSessions: parseInt(overview?.total_revision_sessions || 0),
            };
        }

        // Return a single overview object if only one ID was requested (to keep backward compatibility if needed)
        // OR just return the map as requested.
        // Given the user wants to "map back", a map is good.
        res.status(200).json({
            overviews: formattedResult,
            overview: subjectIds.length === 1 ? formattedResult[subjectIds[0]] : undefined
        });
    } catch (error) {
        console.error('[getOverview]', error);
        res.status(500).json({ error: 'Failed to fetch overview' });
    }
};


export const getTopicPerformance = async (req, res) => {
    try {
        const topics = await analyticsModel.getTopicPerformance({
            subjectId: req.params.subjectId,
        });

        const formatted = topics.map((t) => ({
            topicId: t.topic_id,
            topicName: t.topic_name,
            parentId: t.parent_id,
            total: parseInt(t.total),
            correct: parseInt(t.correct),
            accuracy: parseFloat(t.accuracy),
        }));

        res.status(200).json({ topics: formatted });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch topic performance' });
    }
};

export const getTrends = async (req, res) => {
    try {
        const trends = await analyticsModel.getSessionTrends({
            subjectId: req.params.subjectId,
        });

        const formatted = trends.map((s) => ({
            sessionId: s.session_id,
            title: s.title,
            sessionDate: s.session_date,
            total: parseInt(s.total),
            correct: parseInt(s.correct),
            accuracy: parseFloat(s.accuracy),
        }));

        res.status(200).json({ trends: formatted });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
};

export const getWeakAreas = async (req, res) => {
    try {
        const areas = await analyticsModel.getWeakAreas({
            subjectId: req.params.subjectId,
            minEncounters: parseInt(req.query.minEncounters) || 1,
        });

        const formatted = areas.map((t) => ({
            topicId: t.topic_id,
            topicName: t.topic_name,
            parentId: t.parent_id,
            total: parseInt(t.total),
            correct: parseInt(t.correct),
            incorrect: parseInt(t.incorrect),
            accuracy: parseFloat(t.accuracy),
        }));

        res.status(200).json({ weakAreas: formatted });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weak areas' });
    }
};
export const getSessionTopicDistribution = async (req, res) => {
    try {
        const stats = await analyticsModel.getSessionTopicDistribution({
            sessionId: req.params.sessionId,
        });

        const formatted = stats.map((t) => ({
            topicId: t.topic_id,
            topicName: t.topic_name,
            total: parseInt(t.total),
        }));

        res.status(200).json({ topics: formatted });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch session topic distribution' });
    }
};

export const getTestSeriesAnalytics = async (req, res) => {
    try {
        const { seriesId } = req.params;

        const overview = await analyticsModel.getTestSeriesOverview(seriesId);
        const subjectPerformance = await analyticsModel.getTestSeriesSubjectPerformance(seriesId);
        const detailedStats = await analyticsModel.getTestSeriesDetailedStats(seriesId);

        res.status(200).json({
            overview,
            subjectPerformance,
            detailedStats
        });
    } catch (error) {
        console.error('[getTestSeriesAnalytics]', error);
        res.status(500).json({ error: 'Failed to fetch test series analytics' });
    }
};

export const getTestAnalytics = async (req, res) => {
    try {
        const { testId } = req.params;
        const analytics = await analyticsModel.getTestAnalytics(testId);

        res.status(200).json(analytics);
    } catch (error) {
        console.error('[getTestAnalytics]', error);
        res.status(500).json({ error: 'Failed to fetch test analytics' });
    }
};
