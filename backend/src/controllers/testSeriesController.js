import * as testSeriesModel from '../models/testSeriesModel.js';
import * as testModel from '../models/testModel.js';
import * as subjectModel from '../models/subjectModel.js';

export const getTestSeries = async (req, res) => {
    try {
        const series = await testSeriesModel.findTestSeriesByUser(req.user.id);
        res.status(200).json({ testSeries: series });
    } catch (error) {
        console.error('[getTestSeries]', error);
        res.status(500).json({ error: 'Failed to fetch test series' });
    }
};

export const createTestSeries = async (req, res) => {
    try {
        const { name, description, subjectIds } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const series = await testSeriesModel.createTestSeries({
            userId: req.user.id,
            name,
            description,
            subjectIds
        });

        res.status(201).json({ series });
    } catch (error) {
        console.error('[createTestSeries]', error);
        res.status(500).json({ error: 'Failed to create test series' });
    }
};

export const getTestSeriesDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const series = await testSeriesModel.findTestSeriesById(id, req.user.id);

        if (!series) return res.status(404).json({ error: 'Test series not found' });

        // Load tests inside this series
        const tests = await testModel.findTestsBySeries(id);

        res.status(200).json({ series, tests });
    } catch (error) {
        console.error('[getTestSeriesDetail]', error);
        res.status(500).json({ error: 'Failed to fetch test series details' });
    }
};

export const deleteTestSeries = async (req, res) => {
    try {
        const { id } = req.params;
        const series = await testSeriesModel.findTestSeriesById(id, req.user.id);
        if (!series) return res.status(404).json({ error: 'Test series not found' });

        await testSeriesModel.softDeleteTestSeries(id, req.user.id);
        res.status(200).json({ message: 'Test series deleted successfully' });
    } catch (error) {
        console.error('[deleteTestSeries]', error);
        res.status(500).json({ error: 'Failed to delete test series' });
    }
};

export const updateTestSeries = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, subjectIds } = req.body;

        const series = await testSeriesModel.updateTestSeries(id, req.user.id, {
            name,
            description,
            subjectIds
        });

        res.status(200).json({ series });
    } catch (error) {
        console.error('[updateTestSeries]', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update test series' });
    }
};

