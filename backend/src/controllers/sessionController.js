import * as sessionModel from '../models/sessionModel.js';
import * as subjectModel from '../models/subjectModel.js';
import { addDeletionJob } from '../queues/deletionQueue.js';

export const getSessions = async (req, res) => {
    try {
        const raw = await sessionModel.findSessionsBySubject({
            subjectId: req.params.subjectId,
        });
        const sessions = raw.map((s) => ({
            id: s.id,
            subjectId: s.subject_id,
            title: s.title,
            notes: s.notes,
            sessionDate: s.session_date,
            createdAt: s.created_at,
            totalQuestions: parseInt(s.total_questions) || 0,
            totalCorrect: parseInt(s.total_correct) || 0,
            totalIncorrect: parseInt(s.total_incorrect) || 0,
            accuracy: parseFloat(s.accuracy) || 0,
        }));
        res.status(200).json({ sessions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

export const createSession = async (req, res) => {
    try {
        const { title, notes, sessionDate } = req.body;
        if (!title) return res.status(400).json({ error: 'title is required' });

        const subject = await subjectModel.findSubjectByIdAndUser({
            id: req.params.subjectId,
            userId: req.user.id,
        });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const session = await sessionModel.createSession({
            subjectId: req.params.subjectId,
            title,
            notes,
            sessionDate,
        });
        res.status(201).json({ session });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create session' });
    }
};

export const getSession = async (req, res) => {
    try {
        const session = await sessionModel.findSessionWithEntries({ id: req.params.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.status(200).json({ session });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch session' });
    }
};

export const updateSession = async (req, res) => {
    try {
        const { title, notes, sessionDate } = req.body;
        const updated = await sessionModel.updateSession({
            id: req.params.id,
            title,
            notes,
            sessionDate,
        });
        if (!updated) return res.status(404).json({ error: 'Session not found' });
        res.status(200).json({ session: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update session' });
    }
};

export const deleteSession = async (req, res) => {
    try {
        const session = await sessionModel.findSessionById({ id: req.params.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        await sessionModel.softDeleteSession({ id: req.params.id });
        await addDeletionJob({ type: 'session', sessionId: req.params.id });

        res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete session' });
    }
};
