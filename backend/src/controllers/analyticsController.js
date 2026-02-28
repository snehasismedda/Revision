import * as analyticsModel from '../models/analyticsModel.js';

export const getOverview = async (req, res) => {
    try {
        const overview = await analyticsModel.getSubjectOverview({
            subjectId: req.params.subjectId,
        });

        const totalQuestions = parseInt(overview?.total_questions || 0);
        const totalCorrect = parseInt(overview?.total_correct || 0);
        const accuracy = totalQuestions > 0
            ? Math.round((totalCorrect / totalQuestions) * 100 * 10) / 10
            : 0;

        res.status(200).json({
            overview: {
                totalQuestions,
                totalCorrect,
                totalIncorrect: totalQuestions - totalCorrect,
                accuracy,
                totalSessions: parseInt(overview?.total_sessions || 0),
                topicsCovered: parseInt(overview?.topics_covered || 0),
            },
        });
    } catch (error) {
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
