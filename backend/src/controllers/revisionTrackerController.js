import * as revisionTrackerModel from '../models/revisionTrackerModel.js';

export const listSessions = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const userId = req.user.id;
        const sessions = await revisionTrackerModel.getSessions(subjectId, userId);
        res.status(200).json({ sessions });
    } catch (error) {
        console.error('[revisionTracker.listSessions]', error);
        res.status(500).json({ error: 'Failed to fetch revision sessions' });
    }
};

export const createSession = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const userId = req.user.id;
        const { name, topicIds } = req.body;

        if (!name || !topicIds || topicIds.length === 0) {
            return res.status(400).json({ error: 'Session name and topicIds are required.' });
        }

        const session = await revisionTrackerModel.createSession(subjectId, userId, name, topicIds);
        res.status(201).json({ session });
    } catch (error) {
        console.error('[revisionTracker.createSession]', error);
        res.status(500).json({ error: 'Failed to create revision session' });
    }
};

export const toggleStatus = async (req, res) => {
    try {
        const { sessionId, topicId } = req.params;
        const { status } = req.body; // 'completed' | 'pending'

        if (!['completed', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use "completed" or "pending".' });
        }

        const updated = await revisionTrackerModel.updateTrackerStatus(sessionId, topicId, status);
        res.status(200).json(updated);
    } catch (error) {
        console.error('[revisionTracker.toggleStatus]', error);
        res.status(500).json({ error: 'Failed to update topic status' });
    }
};

export const deleteSession = async (req, res) => {
    try {
        const { subjectId, sessionId } = req.params;
        const userId = req.user.id;
        await revisionTrackerModel.deleteSession(sessionId, subjectId, userId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[revisionTracker.deleteSession]', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
}

export const getRevisionAnalytics = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const userId = req.user.id;
        const data = await revisionTrackerModel.getRevisionAnalytics(subjectId, userId);
        res.status(200).json(data);
    } catch (error) {
        console.error('[revisionTracker.analytics]', error);
        res.status(500).json({ error: 'Failed to fetch revision analytics' });
    }
};
