import db from '../knex/db.js';

export const createTest = async (data) => {
    const { seriesId, name, testDate, subjectIds } = data;

    return await db.transaction(async (trx) => {
        // Create the test
        const [test] = await trx('revision.tests')
            .insert({
                test_series_id: seriesId,
                name,
                test_date: testDate,
            })
            .returning('*');

        // Link subjects if provided
        if (subjectIds && subjectIds.length > 0) {
            const subjectLinks = subjectIds.map(subjectId => ({
                test_id: test.id,
                subject_id: subjectId,
            }));
            await trx('revision.test_subjects').insert(subjectLinks);
        }

        return test;
    });
};

export const findTestsBySeries = async (seriesId) => {
    // Get all tests for series
    const tests = await db('revision.tests')
        .where({ test_series_id: seriesId, is_deleted: false })
        .orderBy('test_date', 'desc');

    if (!tests || tests.length === 0) return [];

    // Fetch associated subjects 
    const testIds = tests.map(t => t.id);
    const subjects = await db('revision.test_subjects as ts')
        .join('revision.subjects as s', 'ts.subject_id', 's.id')
        .whereIn('ts.test_id', testIds)
        .where('s.is_deleted', false)
        .select('ts.test_id', 's.id', 's.name');

    // Group subjects by test_id
    const subjectsByTest = subjects.reduce((acc, curr) => {
        if (!acc[curr.test_id]) acc[curr.test_id] = [];
        acc[curr.test_id].push({ id: curr.id, name: curr.name });
        return acc;
    }, {});

    // Attach to tests
    return tests.map(t => ({
        ...t,
        subjects: subjectsByTest[t.id] || [],
    }));
};

export const findTestById = async (id, seriesId) => {
    const test = await db('revision.tests')
        .where({ id, test_series_id: seriesId, is_deleted: false })
        .first();

    if (!test) return null;

    const subjects = await db('revision.test_subjects as ts')
        .join('revision.subjects as s', 'ts.subject_id', 's.id')
        .where('ts.test_id', id)
        .where('s.is_deleted', false)
        .select('s.id', 's.name');

    // Pull recorded results history for this test (newest first)
    const results = await db('revision.test_results as tr')
        .where('tr.test_id', id)
        .where('tr.is_deleted', false)
        .orderBy('tr.created_at', 'desc')
        .select('*');

    let savedQuestions = [];
    if (results.length > 0 && results[0].session_ids) {
        let sids = results[0].session_ids;
        if (typeof sids === 'string') {
            try { sids = JSON.parse(sids); } catch (e) { }
        }
        if (Array.isArray(sids) && sids.length > 0) {
            const entries = await db('revision.session_entries as se')
                .join('revision.sessions as s', 'se.session_id', 's.id')
                .whereIn('s.id', sids)
                .where('se.is_deleted', false)
                .select('s.subject_id', 'se.topic_id', 'se.is_correct');

            savedQuestions = entries.map((e, idx) => ({
                id: `saved-${Date.now()}-${idx}`,
                subject_id: e.subject_id,
                topic_ids: [e.topic_id],
                is_correct: e.is_correct
            }));
        }
    }

    return { ...test, subjects, results, savedQuestions };
};

export const saveTestResult = async (data) => {
    const { testId, myScore, totalScore, totalQs, sessionIds } = data;

    // Always insert a new row to preserve historical attempts
    const [result] = await db('revision.test_results')
        .insert({
            test_id: testId,
            my_score: myScore,
            total_score: totalScore,
            total_qs: totalQs,
            session_ids: JSON.stringify(sessionIds || [])
        })
        .returning('*');

    return result;
};

export const softDeleteTest = async (id, seriesId) => {
    return db('revision.tests')
        .where({ id, test_series_id: seriesId })
        .update({ is_deleted: true, deleted_at: new Date() });
};

export const updateTest = async (id, seriesId, data) => {
    const { name, testDate, subjectIds } = data;

    return await db.transaction(async (trx) => {
        // Update direct fields
        const [test] = await trx('revision.tests')
            .where({ id, test_series_id: seriesId, is_deleted: false })
            .update({
                name,
                test_date: testDate,
                updated_at: new Date()
            })
            .returning('*');

        if (!test) throw new Error('Test not found');

        // Sync subjects if provided
        if (subjectIds !== undefined) {
            await trx('revision.test_subjects').where({ test_id: id }).delete();
            if (subjectIds.length > 0) {
                const subjectLinks = subjectIds.map(subjectId => ({
                    test_id: id,
                    subject_id: subjectId,
                }));
                await trx('revision.test_subjects').insert(subjectLinks);
            }
        }

        return test;
    });
};

