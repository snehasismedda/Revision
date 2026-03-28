import * as subjectModel from '../models/subjectModel.js';
import * as deletionService from '../services/deletionService.js';

export const getSubjects = async (req, res) => {
    try {
        const subjects = await subjectModel.findSubjectsByUser({ userId: req.user.id });
        res.status(200).json({ subjects });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
};

export const createSubject = async (req, res) => {
    try {
        const { name, description, tags } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });

        const subject = await subjectModel.createSubject({
            userId: req.user.id,
            name,
            description,
            tags: Array.isArray(tags) ? tags : [],
        });
        res.status(201).json({ subject });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create subject' });
    }
};

export const getSubject = async (req, res) => {
    try {
        const subject = await subjectModel.findSubjectByIdAndUser({
            id: req.params.id,
            userId: req.user.id,
        });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });
        
        await subjectModel.touchSubject(req.params.id);
        res.status(200).json({ subject });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subject' });
    }
};

export const updateSubject = async (req, res) => {
    try {
        const { name, description, tags, isArchived } = req.body;
        const updated = await subjectModel.updateSubject({
            id: req.params.id,
            userId: req.user.id,
            name,
            description,
            tags: Array.isArray(tags) ? tags : [],
            isArchived,
        });
        if (!updated) return res.status(404).json({ error: 'Subject not found' });
        res.status(200).json({ subject: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update subject' });
    }
};

export const deleteSubject = async (req, res) => {
    try {
        const subject = await subjectModel.findSubjectByIdAndUser({
            id: req.params.id,
            userId: req.user.id,
        });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        await subjectModel.softDeleteSubject({ id: req.params.id, userId: req.user.id });
        // Cascade soft-delete topics, sessions, entries
        await deletionService.deleteSubjectCascade(req.params.id);

        res.status(200).json({ message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete subject' });
    }
};
