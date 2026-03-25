import * as testModel from '../models/testModel.js';
import * as testSeriesModel from '../models/testSeriesModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as entryModel from '../models/entryModel.js';
import db from '../knex/db.js';

export const createTest = async (req, res) => {
    try {
        const { seriesId } = req.params;
        const { name, testDate, subjectIds } = req.body;

        if (!name) return res.status(400).json({ error: 'Name is required' });

        // Verify user owns the series
        const series = await testSeriesModel.findTestSeriesById(seriesId, req.user.id);
        if (!series) return res.status(404).json({ error: 'Test series not found' });

        const test = await testModel.createTest({
            seriesId,
            name,
            testDate,
            subjectIds
        });

        res.status(201).json({ test });
    } catch (error) {
        console.error('[createTest]', error);
        res.status(500).json({ error: 'Failed to create test' });
    }
};

export const getTestDetail = async (req, res) => {
    try {
        const { seriesId, testId } = req.params;

        // Verify user owns the series
        const series = await testSeriesModel.findTestSeriesById(seriesId, req.user.id);
        if (!series) return res.status(404).json({ error: 'Test series not found' });

        const test = await testModel.findTestById(testId, seriesId);
        if (!test) return res.status(404).json({ error: 'Test not found' });

        res.status(200).json({ test });
    } catch (error) {
        console.error('[getTestDetail]', error);
        res.status(500).json({ error: 'Failed to fetch test details' });
    }
};

export const submitTestResult = async (req, res) => {
    try {
        const { seriesId, testId } = req.params;
        const { myScore, totalScore, totalQs, questions } = req.body;

        // Verify ownership
        const series = await testSeriesModel.findTestSeriesById(seriesId, req.user.id);
        if (!series) return res.status(404).json({ error: 'Test series not found' });

        const test = await testModel.findTestById(testId, seriesId);
        if (!test) return res.status(404).json({ error: 'Test not found' });

        // 1. Get or Create the single Session for this test
        let session = await sessionModel.findSessionByTestId(testId);
        if (!session) {
            session = await sessionModel.createSession({
                testId,
                title: `Full Test: ${test.name}`,
                notes: `Automatically generated from Test Series: ${series.name}`,
                sessionDate: test.test_date || new Date()
            });
        }

        // 2. Prepare flat entries list for all subjects
        const entries = [];
        if (questions && Array.isArray(questions)) {
            questions.forEach(q => {
                const tIds = Array.isArray(q.topic_ids) ? q.topic_ids : [q.topic_id];
                tIds.forEach(tid => {
                    if (tid) {
                        entries.push({
                            topicId: tid,
                            isCorrect: q.is_correct
                        });
                    }
                });
            });
        }

        // 3. Bulk insert entries to that ONE session
        if (entries.length > 0) {
            await entryModel.bulkCreateEntries({
                sessionId: session.id,
                entries: entries
            });
        }

        // 4. Save the historical Test Result 
        const result = await testModel.saveTestResult({
            testId,
            myScore,
            totalScore,
            totalQs,
            sessionIds: [session.id] // Always the same session ID
        });

        res.status(200).json({ result, session });
    } catch (error) {
        console.error('[submitTestResult]', error);
        res.status(500).json({ error: 'Failed to submit test results' });
    }
};


export const deleteTest = async (req, res) => {
    try {
        const { seriesId, testId } = req.params;

        // Verify user owns the series
        const series = await testSeriesModel.findTestSeriesById(seriesId, req.user.id);
        if (!series) return res.status(404).json({ error: 'Test series not found' });

        await testModel.softDeleteTest(testId, seriesId);
        res.status(200).json({ message: 'Test deleted successfully' });
    } catch (error) {
        console.error('[deleteTest]', error);
        res.status(500).json({ error: 'Failed to delete test' });
    }
};

export const updateTest = async (req, res) => {
    try {
        const { seriesId, testId } = req.params;
        const { name, testDate, subjectIds } = req.body;

        // Verify ownership
        const series = await testSeriesModel.findTestSeriesById(seriesId, req.user.id);
        if (!series) return res.status(404).json({ error: 'Test series not found' });

        const test = await testModel.updateTest(testId, seriesId, {
            name,
            testDate,
            subjectIds
        });

        res.status(200).json({ test });
    } catch (error) {
        console.error('[updateTest]', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update test' });
    }
};

export const getTestResults = async (req, res) => {
    try {
        const { seriesId, testId } = req.params;

        const series = await testSeriesModel.findTestSeriesById(seriesId, req.user.id);
        if (!series) return res.status(404).json({ error: 'Test series not found' });

        const results = await db('revision.test_results as tr')
            .where('tr.test_id', testId)
            .where('tr.is_deleted', false)
            .orderBy('tr.created_at', 'desc')
            .select('*');

        res.status(200).json({ results });
    } catch (error) {
        console.error('[getTestResults]', error);
        res.status(500).json({ error: 'Failed to fetch test results' });
    }
};

