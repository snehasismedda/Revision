import * as entryModel from '../models/entryModel.js';

export const createEntries = async (req, res) => {
    try {
        const { entries } = req.body;
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: 'entries array is required' });
        }

        const created = await entryModel.bulkCreateEntries({
            sessionId: req.params.sessionId,
            entries,
        });
        res.status(201).json({ entries: created });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save entries' });
    }
};

export const updateEntries = async (req, res) => {
    try {
        const { entries } = req.body;
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: 'entries array is required' });
        }

        const updated = await entryModel.replaceSessionEntries({
            sessionId: req.params.sessionId,
            entries,
        });
        res.status(200).json({ entries: updated });
    } catch (error) {
        console.error('updateEntries error:', error);
        res.status(500).json({ error: 'Failed to update entries', details: error.message });
    }
};

export const getEntries = async (req, res) => {
    try {
        const entries = await entryModel.findEntriesBySession({
            sessionId: req.params.sessionId,
        });
        res.status(200).json({ entries });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
};
