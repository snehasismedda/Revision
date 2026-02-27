import * as topicModel from '../models/topicModel.js';
import * as subjectModel from '../models/subjectModel.js';

const buildTopicTree = (topics) => {
    const map = {};
    const roots = [];

    topics.forEach((t) => {
        map[t.id] = { ...t, children: [] };
    });

    topics.forEach((t) => {
        if (t.parent_id && map[t.parent_id]) {
            map[t.parent_id].children.push(map[t.id]);
        } else {
            roots.push(map[t.id]);
        }
    });

    return roots;
};

export const getTopics = async (req, res) => {
    try {
        const topics = await topicModel.findTopicsBySubject({ subjectId: req.params.subjectId });
        res.status(200).json({ topics: buildTopicTree(topics) });
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
        await topicModel.softDeleteTopic({ id: req.params.id });
        res.status(200).json({ message: 'Topic deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete topic' });
    }
};
