import * as topicModel from '../models/topicModel.js';
import * as subjectModel from '../models/subjectModel.js';
import * as deletionService from '../services/deletionService.js';

export const getTopics = async (req, res) => {
    try {
        const topics = await topicModel.findTopicsBySubject({ subjectId: req.params.subjectId });
        res.status(200).json({ topics: topicModel.buildTopicTree(topics) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch topics' });
    }
};

export const createTopic = async (req, res) => {
    try {
        const { name, parentId, orderIndex } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });

        const subject = await subjectModel.findSubjectByIdAndUser({
            id: req.params.subjectId,
            userId: req.user.id,
        });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const topic = await topicModel.createTopic({
            subjectId: req.params.subjectId,
            name,
            parentId: parentId || null,
            orderIndex: orderIndex || 0,
        });
        res.status(201).json({ topic });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create topic' });
    }
};

export const bulkCreateTopics = async (req, res) => {
    try {
        const { topics } = req.body;
        if (!topics || !Array.isArray(topics) || topics.length === 0) {
            return res.status(400).json({ error: 'topics array is required' });
        }

        const subject = await subjectModel.findSubjectByIdAndUser({
            id: req.params.subjectId,
            userId: req.user.id,
        });
        if (!subject) return res.status(404).json({ error: 'Subject not found' });

        const created = await topicModel.bulkCreateTopics({
            subjectId: req.params.subjectId,
            topics,
        });
        res.status(201).json({ topics: created });
    } catch (error) {
        res.status(500).json({ error: 'Failed to bulk create topics' });
    }
};

export const updateTopic = async (req, res) => {
    try {
        const { name, orderIndex } = req.body;
        const updated = await topicModel.updateTopic({
            id: req.params.id,
            name,
            orderIndex,
        });
        if (!updated) return res.status(404).json({ error: 'Topic not found' });
        res.status(200).json({ topic: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update topic' });
    }
};

export const deleteTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { topicIds } = req.body;

        const ids = topicIds && Array.isArray(topicIds) ? topicIds : [id];

        if (ids.length === 0 || !ids[0]) {
            return res.status(400).json({ error: 'No topic IDs provided' });
        }

        // 1. Cascade cleanup related data while topics are still "active"
        await deletionService.deleteTopicsCascade(ids);

        // 2. Mark topic (and its descendants) as deleted
        await topicModel.softDeleteTopics(ids);


        res.status(200).json({ message: 'Topics deleted successfully', deletedCount: ids.length });
    } catch (error) {
        console.error(`[topicController] ❌ Error deleting topics:`, error);
        res.status(500).json({ error: 'Failed to delete topics' });
    }
};

