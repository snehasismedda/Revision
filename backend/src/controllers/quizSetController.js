import { createQuizSet, getQuizSets, getQuizSetById, deleteQuizSet, updateQuizSet } from '../models/quizSetModel.js';

export const createQuizSetController = async (req, res) => {
    try {
        const { name, data } = req.body;

        if (!name || !data) {
            return res.status(400).json({ error: 'Name and data are required' });
        }

        const newQuizSet = await createQuizSet({
            name,
            data: typeof data === 'string' ? data : JSON.stringify(data)
        });

        res.status(201).json(newQuizSet);
    } catch (error) {
        console.error('Error creating quiz set:', error);
        res.status(500).json({ error: 'Failed to save quiz set' });
    }
};

export const getQuizSetsController = async (req, res) => {
    try {
        const quizSets = await getQuizSets();
        const summary = quizSets.map(qs => {
            let sheetsCount = 0;
            let totalQuestions = 0;
            try {
                const data = typeof qs.data === 'string' ? JSON.parse(qs.data) : qs.data;
                sheetsCount = Object.keys(data).length;
                totalQuestions = Object.values(data).reduce((acc, sheet) => acc + (Array.isArray(sheet) ? sheet.length : 0), 0);
            } catch (e) {
                console.error('Error parsing quiz data for summary:', e);
            }

            return {
                id: qs.id,
                name: qs.name,
                created_at: qs.created_at,
                sheetsCount,
                totalQuestions
            };
        });
        res.status(200).json(summary);
    } catch (error) {
        console.error('Error getting quiz sets:', error);
        res.status(500).json({ error: 'Failed to retrieve quiz sets' });
    }
};

export const getQuizSetByIdController = async (req, res) => {
    try {
        const quizSet = await getQuizSetById(req.params.id);
        if (!quizSet) {
            return res.status(404).json({ error: 'Quiz set not found' });
        }
        res.status(200).json(quizSet);
    } catch (error) {
        console.error('Error getting quiz set:', error);
        res.status(500).json({ error: 'Failed to retrieve quiz set' });
    }
};

export const deleteQuizSetController = async (req, res) => {
    try {
        const deleted = await deleteQuizSet(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Quiz set not found' });
        }
        res.status(200).json({ message: 'Quiz set deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz set:', error);
        res.status(500).json({ error: 'Failed to delete quiz set' });
    }
};

export const updateQuizSetController = async (req, res) => {
    try {
        const { name, data } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (data) updateData.data = typeof data === 'string' ? data : JSON.stringify(data);

        const updated = await updateQuizSet(req.params.id, updateData);
        if (!updated) {
            return res.status(404).json({ error: 'Quiz set not found' });
        }
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating quiz set:', error);
        res.status(500).json({ error: 'Failed to update quiz set' });
    }
};
