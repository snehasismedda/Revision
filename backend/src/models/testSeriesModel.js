import db from '../knex/db.js';

export const createTestSeries = async (data) => {
    const { userId, name, description, subjectIds } = data;

    return await db.transaction(async (trx) => {
        // Create the test series
        const [testSeries] = await trx('revision.test_series')
            .insert({
                user_id: userId,
                name,
                description,
            })
            .returning('*');

        // Link subjects if provided
        if (subjectIds && subjectIds.length > 0) {
            const subjectLinks = subjectIds.map(subjectId => ({
                test_series_id: testSeries.id,
                subject_id: subjectId,
            }));
            await trx('revision.test_series_subjects').insert(subjectLinks);
        }

        return testSeries;
    });
};

export const findTestSeriesByUser = async (userId) => {
    // 1. Get all series for the user
    const series = await db('revision.test_series')
        .where({ user_id: userId, is_deleted: false })
        .orderBy('created_at', 'desc');

    if (!series || series.length === 0) return [];

    const seriesIds = series.map(s => s.id);

    // 2. Fetch associated subjects for all these series
    const subjects = await db('revision.test_series_subjects as tss')
        .join('revision.subjects as s', 'tss.subject_id', 's.id')
        .whereIn('tss.test_series_id', seriesIds)
        .where('s.is_deleted', false)
        .select('tss.test_series_id', 's.id', 's.name');

    // 3. Fetch test counts for all these series
    const testCounts = await db('revision.tests')
        .whereIn('test_series_id', seriesIds)
        .where('is_deleted', false)
        .groupBy('test_series_id')
        .select('test_series_id', db.raw('count(*) as count'));

    // 4. Map everything together
    const subjectsBySeries = subjects.reduce((acc, curr) => {
        if (!acc[curr.test_series_id]) acc[curr.test_series_id] = [];
        acc[curr.test_series_id].push({ id: curr.id, name: curr.name });
        return acc;
    }, {});

    const countsBySeries = testCounts.reduce((acc, curr) => {
        acc[curr.test_series_id] = parseInt(curr.count);
        return acc;
    }, {});

    return series.map(s => ({
        ...s,
        subjects: subjectsBySeries[s.id] || [],
        testCount: countsBySeries[s.id] || 0
    }));
};


export const findTestSeriesById = async (id, userId) => {
    const series = await db('revision.test_series')
        .where({ id, user_id: userId, is_deleted: false })
        .first();

    if (!series) return null;

    const subjects = await db('revision.test_series_subjects as tss')
        .join('revision.subjects as s', 'tss.subject_id', 's.id')
        .where('tss.test_series_id', id)
        .where('s.is_deleted', false)
        .select('s.id', 's.name');

    return { ...series, subjects };
};

export const softDeleteTestSeries = async (id, userId) => {
    return db('revision.test_series')
        .where({ id, user_id: userId })
        .update({ is_deleted: true, deleted_at: new Date() });
};

export const updateTestSeries = async (id, userId, data) => {
    const { name, description, subjectIds } = data;

    return await db.transaction(async (trx) => {
        // Update direct fields
        const [series] = await trx('revision.test_series')
            .where({ id, user_id: userId, is_deleted: false })
            .update({
                name,
                description,
                updated_at: new Date()
            })
            .returning('*');

        if (!series) throw new Error('Test series not found or unauthorized');

        // Sync subjects if provided
        if (subjectIds !== undefined) {
            await trx('revision.test_series_subjects').where({ test_series_id: id }).delete();
            if (subjectIds.length > 0) {
                const subjectLinks = subjectIds.map(subjectId => ({
                    test_series_id: id,
                    subject_id: subjectId,
                }));
                await trx('revision.test_series_subjects').insert(subjectLinks);
            }
        }

        return series;
    });
};

