import db from '../knex/db.js';

export const getSubjectOverview = async (data) => {
    const attempts = await db('revision.session_entries as se')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('t.subject_id', data.subjectId)
        .where('s.is_deleted', false)
        .where('se.is_deleted', false)
        .where('t.is_deleted', false)
        .select(
            db.raw('COUNT(*) as total_questions'),
            db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as total_correct'),
            db.raw('COUNT(DISTINCT se.topic_id) as topics_covered'),
        )
        .first();


    const qs = await db('revision.questions')
        .where('subject_id', data.subjectId)
        .where('is_deleted', false)
        .count('* as count')
        .first();

    const sess = await db('revision.sessions')
        .where('subject_id', data.subjectId)
        .where('is_deleted', false)
        .count('* as count')
        .first();

    const revSess = await db('revision.revision_sessions')
        .where('subject_id', data.subjectId)
        .count('* as count')
        .first();

    const tpc = await db('revision.topics')
        .where('subject_id', data.subjectId)
        .where('is_deleted', false)
        .count('* as count')
        .first();

    return {
        total_questions: attempts?.total_questions || 0,
        total_correct: attempts?.total_correct || 0,
        topics_covered: attempts?.topics_covered || 0,
        total_topics: tpc?.count || 0,
        available_questions: qs?.count || 0,
        total_sessions: sess?.count || 0,
        total_revision_sessions: revSess?.count || 0,
    };
};

export const getTopicPerformance = async (data) => {
    return db('revision.session_entries as se')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('t.subject_id', data.subjectId)
        .where('s.is_deleted', false)
        .where('se.is_deleted', false)
        .where('t.is_deleted', false)

        .groupBy('t.id', 't.name', 't.parent_id')
        .select(
            't.id as topic_id',
            't.name as topic_name',
            't.parent_id',
            db.raw('COUNT(*) as total'),
            db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as correct'),
            db.raw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy'),
        )
        .orderBy('accuracy', 'asc');
};

export const getSessionTrends = async (data) => {
    return db('revision.session_entries as se')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('t.subject_id', data.subjectId)
        .where('s.is_deleted', false)
        .where('se.is_deleted', false)

        .groupBy('s.id', 's.title', 's.session_date')
        .select(
            's.id as session_id',
            's.title',
            's.session_date',
            db.raw('COUNT(*) as total'),
            db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as correct'),
            db.raw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy'),
        )
        .orderBy('s.session_date', 'asc');
};

export const getWeakAreas = async (data) => {
    return db('revision.session_entries as se')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('t.subject_id', data.subjectId)
        .where('s.is_deleted', false)
        .where('se.is_deleted', false)
        .where('t.is_deleted', false)

        .groupBy('t.id', 't.name', 't.parent_id')
        .havingRaw('COUNT(*) >= ?', [data.minEncounters || 1])
        .havingRaw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) < 75')
        .select(
            't.id as topic_id',
            't.name as topic_name',
            't.parent_id',
            db.raw('COUNT(*) as total'),
            db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as correct'),
            db.raw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy'),
            db.raw('COUNT(*) - SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as incorrect'),
        )
        .orderByRaw('accuracy ASC, total DESC')
        .limit(10);
};

export const getUserPerformanceSummary = async (userId) => {
    return db('revision.session_entries as se')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.subjects as sub', 't.subject_id', 'sub.id')
        .where('sub.user_id', userId)
        .where('s.is_deleted', false)
        .where('se.is_deleted', false)
        .where('sub.is_deleted', false)

        .select(
            db.raw('COUNT(*) as total_questions'),
            db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as total_correct'),
            db.raw('COUNT(DISTINCT s.id) as total_sessions'),
            db.raw('COUNT(DISTINCT s.subject_id) as total_subjects'),
            db.raw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as global_accuracy'),
        )
        .first();
};

export const getGlobalWeakAreas = async (userId) => {
    return db('revision.session_entries as se')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .join('revision.subjects as sub', 't.subject_id', 'sub.id')
        .where('sub.user_id', userId)
        .where('s.is_deleted', false)
        .where('se.is_deleted', false)
        .where('t.is_deleted', false)
        .where('sub.is_deleted', false)

        .groupBy('t.id', 't.name', 'sub.name')
        .havingRaw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) < 75')
        .select(
            't.id as topic_id',
            't.name as topic_name',
            'sub.name as subject_name',
            db.raw('COUNT(*) as total'),
            db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as correct'),
            db.raw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy'),
        )
        .orderByRaw('accuracy ASC, total DESC')
        .limit(5);
};
export const getSessionTopicDistribution = async (data) => {
    return db('revision.session_entries as se')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('se.session_id', data.sessionId)
        .where('se.is_deleted', false)
        .groupBy('t.id', 't.name')
        .select(
            't.id as topic_id',
            't.name as topic_name',
            db.raw('COUNT(*) as total')
        );
};

export const getTestSeriesOverview = async (seriesId) => {
    // Basic stats: total tests, total subjects
    const testCount = await db('revision.tests')
        .where('test_series_id', seriesId)
        .where('is_deleted', false)
        .count('* as count')
        .first();

    const subjectCount = await db('revision.test_series_subjects')
        .where('test_series_id', seriesId)
        .count('* as count')
        .first();

    return {
        total_tests: parseInt(testCount?.count || 0),
        total_subjects: parseInt(subjectCount?.count || 0)
    };
};

export const getTestSeriesSubjectPerformance = async (seriesId) => {
    // 1. Get all session IDs across all tests in the series
    const testResults = await db('revision.test_results as tr')
        .join('revision.tests as t', 'tr.test_id', 't.id')
        .where('t.test_series_id', seriesId)
        .where('tr.is_deleted', false)
        .where('t.is_deleted', false)
        .select('tr.session_ids');

    let allSessionIds = [];
    testResults.forEach(row => {
        let sids = row.session_ids;
        if (typeof sids === 'string') {
            try { sids = JSON.parse(sids); } catch (e) { }
        }
        if (Array.isArray(sids)) {
            allSessionIds = allSessionIds.concat(sids);
        }
    });

    if (allSessionIds.length === 0) return [];

    // 2. Aggregate from these session IDs
    return db('revision.session_entries as se')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .join('revision.subjects as sub', 't.subject_id', 'sub.id')
        .whereIn('s.id', allSessionIds)
        .where('se.is_deleted', false)
        .groupBy('sub.id', 'sub.name')

        .select(
            'sub.id as subject_id',
            'sub.name as subject_name',
            db.raw('COUNT(*) as total_questions'),
            db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as total_correct'),
            db.raw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as overall_accuracy')
        )
        .orderBy('overall_accuracy', 'desc');
};

export const getTestAnalytics = async (testId) => {
    // 1. Fetch all historical test results for this test
    const results = await db('revision.test_results')
        .where('test_id', testId)
        .where('is_deleted', false)
        .orderBy('created_at', 'asc') // Oldest first
        .select('*');

    if (!results || results.length === 0) {
        return {
            global: { subjectPerformance: [], topicPerformance: [] },
            attempts: [],
            stats: { avgAccuracy: 0, bestAccuracy: 0, worstAccuracy: 0, improvement: 0, totalAttempts: 0 },
            subjectTrend: {}
        };
    }

    // Helper function to fetch both Subject and Topic performance for an array of session IDs
    const fetchPerformanceStats = async (sessionIds) => {
        if (!sessionIds || sessionIds.length === 0) {
            return { subjectPerformance: [], topicPerformance: [] };
        }

        // Subject Performance
        const subjectPerformance = await db('revision.session_entries as se')
            .join('revision.sessions as s', 'se.session_id', 's.id')
            .join('revision.topics as t', 'se.topic_id', 't.id')
            .join('revision.subjects as sub', 't.subject_id', 'sub.id')
            .whereIn('s.id', sessionIds)
            .where('se.is_deleted', false)
            .groupBy('sub.id', 'sub.name')

            .select(
                'sub.id as subject_id',
                'sub.name as subject_name',
                db.raw('COUNT(*) as total_questions'),
                db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as total_correct'),
                db.raw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy')
            )
            .orderBy('accuracy', 'desc');

        // Topic Performance
        const topicPerformance = await db('revision.session_entries as se')
            .join('revision.sessions as s', 'se.session_id', 's.id')
            .join('revision.topics as t', 'se.topic_id', 't.id')
            .join('revision.subjects as sub', 't.subject_id', 'sub.id')
            .whereIn('s.id', sessionIds)
            .where('se.is_deleted', false)
            .groupBy('t.id', 't.name', 'sub.name')
            .select(
                't.id as topic_id',
                't.name as topic_name',
                'sub.name as subject_name',
                db.raw('COUNT(*) as total_questions'),
                db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as total_correct'),
                db.raw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy')
            )
            .orderBy('total_questions', 'desc');


        return { subjectPerformance, topicPerformance };
    };

    // 2. Loop through each attempt to build individual analytics
    const attempts = [];
    let allSessionIds = [];

    for (const result of results) {
        let attemptSessionIds = result.session_ids;
        if (typeof attemptSessionIds === 'string') {
            try { attemptSessionIds = JSON.parse(attemptSessionIds); } catch (e) { }
        }

        attemptSessionIds = Array.isArray(attemptSessionIds) ? attemptSessionIds : [];
        allSessionIds = allSessionIds.concat(attemptSessionIds);

        const acc = (result.total_score && Number(result.total_score) > 0)
            ? Math.round(100.0 * Number(result.my_score) / Number(result.total_score) * 10) / 10
            : 0;

        // Fetch local attempt stats
        const { subjectPerformance, topicPerformance } = await fetchPerformanceStats(attemptSessionIds);

        attempts.push({
            result,
            accuracy: acc,
            subjectPerformance,
            topicPerformance
        });
    }



    // 3. Compute summary stats
    const accuracies = attempts.map(a => Number(a.accuracy));
    const scores = attempts.map(a => Number(a.result?.my_score || 0));
    const n_acc = accuracies.length;

    const avgAccuracy = n_acc > 0
        ? Math.round(accuracies.reduce((a, b) => a + b, 0) / n_acc * 10) / 10
        : 0;
    const bestAccuracy = n_acc > 0 ? Math.max(...accuracies) : 0;
    const worstAccuracy = n_acc > 0 ? Math.min(...accuracies) : 0;
    const avgScore = n_acc > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / n_acc * 10) / 10 : 0;
    const bestScore = n_acc > 0 ? Math.max(...scores) : 0;

    const improvement = n_acc >= 2
        ? Math.round((accuracies[n_acc - 1] - accuracies[0]) * 10) / 10
        : 0;

    // Consistency score (100 = perfectly stable, drops with high std dev)
    let consistencyScore = 100;
    if (n_acc > 1) {
        const variance = accuracies.reduce((s, a) => s + Math.pow(a - avgAccuracy, 2), 0) / n_acc;
        const stdDev = Math.sqrt(variance);
        consistencyScore = Math.max(0, Math.round(100 - stdDev * 2));
    }

    // Projected accuracy for the NEXT attempt via linear regression
    let projectedAccuracy = null;
    if (n_acc >= 2) {
        const xs = accuracies.map((_, i) => i);
        const sumX = xs.reduce((a, b) => a + b, 0);
        const sumY = accuracies.reduce((a, b) => a + b, 0);
        const sumXY = xs.reduce((s, x, i) => s + x * accuracies[i], 0);
        const sumX2 = xs.reduce((s, x) => s + x * x, 0);
        const denom = n_acc * sumX2 - sumX * sumX;
        if (denom !== 0) {
            const slope = (n_acc * sumXY - sumX * sumY) / denom;
            const intercept = (sumY - slope * sumX) / n_acc;
            projectedAccuracy = Math.round(Math.max(0, Math.min(100, slope * n_acc + intercept)) * 10) / 10;
        }
    }

    // 4. Subject trend across attempts
    const subjectTrend = {};
    attempts.forEach((a) => {
        a.subjectPerformance.forEach((sp) => {
            if (!subjectTrend[sp.subject_name]) subjectTrend[sp.subject_name] = [];
            subjectTrend[sp.subject_name].push(Number(sp.accuracy));
        });
    });

    // 5. Fetch global stats across all aggregated sessions
    const globalStats = await fetchPerformanceStats(allSessionIds);

    // 6. Calculate Subject Marks contribution based on the latest attempt's score-per-question or average
    // We'll add 'contribution_marks' to each global subject performance item.
    // If we have multiple attempts, we take the average marks obtained per subject.
    globalStats.subjectPerformance = globalStats.subjectPerformance.map(s => {
        // Average marks per question across all attempts = total_score / total_qs
        const avgMarksPerQ = attempts.length > 0
            ? attempts.reduce((acc, a) => acc + (Number(a.result.total_score) / (Number(a.result.total_qs) || 1)), 0) / attempts.length
            : 0;
        return {
            ...s,
            contribution_marks: Math.round(Number(s.total_correct) * avgMarksPerQ * 10) / 10
        };
    });

    // 7. Exam Trap Topics: high frequency AND low accuracy → highest exam risk
    const topicList = globalStats.topicPerformance;
    const topicCounts = topicList.map(t => Number(t.total_questions)).sort((a, b) => a - b);
    const medianCount = topicCounts.length > 0 ? topicCounts[Math.floor(topicCounts.length / 2)] : 0;
    const examTrapTopics = topicList
        .filter(t => Number(t.total_questions) >= medianCount && Number(t.accuracy) < 65)
        .map(t => ({
            topic_name: t.topic_name,
            total_questions: t.total_questions,
            total_correct: t.total_correct,
            accuracy: t.accuracy,
            // risk = questions_seen × wrong_rate  (higher = more dangerous in exam)
            riskScore: Math.round(Number(t.total_questions) * (100 - Number(t.accuracy)) / 100)
        }))
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 6);

    return {
        global: {
            subjectPerformance: globalStats.subjectPerformance,
            topicPerformance: globalStats.topicPerformance
        },
        attempts,
        stats: {
            avgAccuracy,
            bestAccuracy,
            worstAccuracy,
            avgScore,
            bestScore,
            improvement,
            totalAttempts: attempts.length,
            consistencyScore,
            projectedAccuracy
        },
        subjectTrend,
        examTrapTopics
    };
};


