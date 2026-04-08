import db from '../knex/db.js';

export const getSubjectsOverview = async (subjectIds) => {
    if (!subjectIds || subjectIds.length === 0) return {};

    // 1. Attempts stats
    const attempts = await db('revision.session_entries as se')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .whereIn('t.subject_id', subjectIds)
        .where('s.is_deleted', false)
        .where('se.is_deleted', false)
        .where('t.is_deleted', false)
        .groupBy('t.subject_id')
        .select(
            't.subject_id',
            db.raw('COUNT(*) as total_questions'),
            db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as total_correct'),
            db.raw('COUNT(DISTINCT se.topic_id) as topics_covered'),
        );

    // 2. Question counts
    const qs = await db('revision.questions')
        .whereIn('subject_id', subjectIds)
        .where('is_deleted', false)
        .groupBy('subject_id')
        .select('subject_id', db.raw('COUNT(*) as count'));

    // 3. Question counts (continued)
    // 4. Revision session counts
    const revSess = await db('revision.revision_sessions')
        .whereIn('subject_id', subjectIds)
        .groupBy('subject_id')
        .select('subject_id', db.raw('COUNT(*) as count'));

    // 5. Topic counts
    const tpc = await db('revision.topics')
        .whereIn('subject_id', subjectIds)
        .where('is_deleted', false)
        .groupBy('subject_id')
        .select('subject_id', db.raw('COUNT(*) as count'));

    // 6. Note counts
    const notes = await db('revision.notes')
        .whereIn('subject_id', subjectIds)
        .where('is_deleted', false)
        .groupBy('subject_id')
        .select('subject_id', db.raw('COUNT(*) as count'));

    // 7. Solution counts
    const solutions = await db('revision.solutions')
        .whereIn('subject_id', subjectIds)
        .where('is_deleted', false)
        .groupBy('subject_id')
        .select('subject_id', db.raw('COUNT(*) as count'));

    // 8. File counts
    const files = await db('revision.files')
        .whereIn('subject_id', subjectIds)
        .where('is_deleted', false)
        .groupBy('subject_id')
        .select('subject_id', db.raw('COUNT(*) as count'));

    // Map all results back
    const result = {};
    for (const id of subjectIds) {
        const att = attempts.find(a => a.subject_id == id);
        const q = qs.find(a => a.subject_id == id);
        const rs = revSess.find(a => a.subject_id == id);
        const t = tpc.find(a => a.subject_id == id);
        const n = notes.find(a => a.subject_id == id);
        const sl = solutions.find(a => a.subject_id == id);
        const fl = files.find(a => a.subject_id == id);

        // Session count remains specific due to OR/EXISTS logic which is tricky to batch perfectly with GROUP BY
        const accurateSessCount = await db('revision.sessions as s')
            .where('s.is_deleted', false)
            .where(function () {
                this.where('s.subject_id', id)
                    .orWhereExists(function () {
                        this.select('*')
                            .from('revision.session_entries as se')
                            .join('revision.topics as t', 'se.topic_id', 't.id')
                            .whereRaw('se.session_id = s.id')
                            .where('t.subject_id', id)
                            .where('se.is_deleted', false)
                            .where('t.is_deleted', false);
                    });
            })
            .count('* as count')
            .first();

        result[id] = {
            total_questions: parseInt(att?.total_questions || 0),
            total_correct: parseInt(att?.total_correct || 0),
            topics_covered: parseInt(att?.topics_covered || 0),
            total_topics: parseInt(tpc.find(a => a.subject_id == id)?.count || 0), // Use tpc specifically
            available_questions: parseInt(q?.count || 0),
            total_sessions: parseInt(accurateSessCount?.count || 0),
            total_revision_sessions: parseInt(rs?.count || 0),
            total_notes: parseInt(n?.count || 0),
            total_solutions: parseInt(sl?.count || 0),
            total_files: parseInt(fl?.count || 0),
        };
    }


    return result;
};



export const getSubjectOverview = async (data) => {
    const res = await getSubjectsOverview([data.subjectId]);
    return res[data.subjectId] || {};
};


export const getTopicPerformance = async (data) => {
    // We want ALL topics for this subject, paired with entry stats if any
    const topics = await db('revision.topics')
        .where('subject_id', data.subjectId)
        .where('is_deleted', false)
        .select('id as topic_id', 'name as topic_name', 'parent_id')
        .orderBy('name', 'asc');

    const stats = await db('revision.session_entries as se')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('t.subject_id', data.subjectId)
        .where('s.is_deleted', false)
        .where('se.is_deleted', false)
        .groupBy('t.id')
        .select(
            't.id as topic_id',
            db.raw('COUNT(*) as total'),
            db.raw('SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) as correct'),
            db.raw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy'),
        );

    return topics.map(t => {
        const s = stats.find(st => st.topic_id === t.topic_id);
        return {
            ...t,
            total: parseInt(s?.total || 0),
            correct: parseInt(s?.correct || 0),
            accuracy: parseFloat(s?.accuracy || 0),
        };
    });
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

    const series = await db('revision.test_series')
        .where('id', seriesId)
        .select('name')
        .first();

    return {
        series_name: series?.name || 'Unknown Series',
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

export const getTestSeriesDetailedStats = async (seriesId) => {
    // 1. Fetch all test results for tests in this series, ordered by test date or result creation
    const results = await db('revision.test_results as tr')
        .join('revision.tests as t', 'tr.test_id', 't.id')
        .where('t.test_series_id', seriesId)
        .where('tr.is_deleted', false)
        .where('t.is_deleted', false)
        .orderBy('t.test_date', 'asc') // Order by the date of the test
        .orderBy('tr.created_at', 'asc') // Then by attempt time
        .select('tr.*', 't.name as test_name', 't.test_date');

    if (!results || results.length === 0) {
        return {
            seriesTrend: [],
            subjectTrend: {},
            stats: { avgAccuracy: 0, bestAccuracy: 0, worstAccuracy: 0, totalAttempts: 0 }
        };
    }

    const fetchSubjectPerformance = async (sessionIds) => {
        if (!sessionIds || sessionIds.length === 0) return [];
        return db('revision.session_entries as se')
            .join('revision.sessions as s', 'se.session_id', 's.id')
            .join('revision.topics as t', 'se.topic_id', 't.id')
            .join('revision.subjects as sub', 't.subject_id', 'sub.id')
            .whereIn('s.id', sessionIds)
            .where('se.is_deleted', false)
            .groupBy('sub.id', 'sub.name')
            .select(
                'sub.id as subject_id',
                'sub.name as subject_name',
                db.raw('ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy')
            );
    };

    const seriesTrend = [];
    const subjectTrend = {};
    const accuracies = [];

    for (const result of results) {
        let sessionIds = result.session_ids;
        if (typeof sessionIds === 'string') {
            try { sessionIds = JSON.parse(sessionIds); } catch (e) { }
        }
        sessionIds = Array.isArray(sessionIds) ? sessionIds : [];

        const acc = (result.total_score && Number(result.total_score) > 0)
            ? Math.round(100.0 * Number(result.my_score) / Number(result.total_score) * 10) / 10
            : 0;

        accuracies.push(acc);
        const testIndex = seriesTrend.length;
        
        seriesTrend.push({
            test_id: result.test_id,
            test_name: result.test_name,
            test_date: result.test_date,
            accuracy: acc,
            score: Number(result.my_score),
            max_score: Number(result.total_score)
        });

        const subjectPerf = await fetchSubjectPerformance(sessionIds);
        subjectPerf.forEach(sp => {
            if (!subjectTrend[sp.subject_name]) subjectTrend[sp.subject_name] = [];
            
            subjectTrend[sp.subject_name].push({
                testIndex: testIndex,
                test_name: result.test_name,
                accuracy: Number(sp.accuracy)
            });
        });
    }

    const n_acc = accuracies.length;
    const avgAccuracy = n_acc > 0 ? Math.round(accuracies.reduce((a, b) => a + b, 0) / n_acc * 10) / 10 : 0;
    const bestAccuracy = n_acc > 0 ? Math.max(...accuracies) : 0;
    const worstAccuracy = n_acc > 0 ? Math.min(...accuracies) : 0;

    return {
        seriesTrend,
        subjectTrend,
        stats: {
            avgAccuracy,
            bestAccuracy,
            worstAccuracy,
            totalAttempts: n_acc
        }
    };
};

/**
 * getActivityMap — aggregates daily activity across all user collections.
 * Returns an array of { date, notes, solutions, questions, sessions, test_attempts, revision_sessions, topics_revised }
 * for the last `months` months.
 */
export const getActivityMap = async (userId, months = 6) => {
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - months);
    const since = sinceDate.toISOString().split('T')[0]; // YYYY-MM-DD


    // 1. Notes created per day
    const notesPerDay = db('revision.notes as n')
        .join('revision.subjects as sub', 'n.subject_id', 'sub.id')
        .where('sub.user_id', userId)
        .where('n.is_deleted', false)
        .where('sub.is_deleted', false)
        .whereRaw("n.created_at >= ?::date", [since])
        .groupByRaw("DATE(n.created_at)")
        .select(
            db.raw("DATE(n.created_at) as activity_date"),
            db.raw("COUNT(*)::int as notes"),
            db.raw("0::int as solutions"),
            db.raw("0::int as questions"),
            db.raw("0::int as sessions"),
            db.raw("0::int as test_attempts"),
            db.raw("0::int as revision_sessions"),
            db.raw("0::int as topics_revised")
        );

    // 2. Solutions created per day
    const solutionsPerDay = db('revision.solutions as s')
        .join('revision.subjects as sub', 's.subject_id', 'sub.id')
        .where('sub.user_id', userId)
        .where('s.is_deleted', false)
        .where('sub.is_deleted', false)
        .whereRaw("s.created_at >= ?::date", [since])
        .groupByRaw("DATE(s.created_at)")
        .select(
            db.raw("DATE(s.created_at) as activity_date"),
            db.raw("0::int as notes"),
            db.raw("COUNT(*)::int as solutions"),
            db.raw("0::int as questions"),
            db.raw("0::int as sessions"),
            db.raw("0::int as test_attempts"),
            db.raw("0::int as revision_sessions"),
            db.raw("0::int as topics_revised")
        );

    // 3. Questions created per day
    const questionsPerDay = db('revision.questions as q')
        .join('revision.subjects as sub', 'q.subject_id', 'sub.id')
        .where('sub.user_id', userId)
        .where('q.is_deleted', false)
        .where('sub.is_deleted', false)
        .whereRaw("q.created_at >= ?::date", [since])
        .groupByRaw("DATE(q.created_at)")
        .select(
            db.raw("DATE(q.created_at) as activity_date"),
            db.raw("0::int as notes"),
            db.raw("0::int as solutions"),
            db.raw("COUNT(*)::int as questions"),
            db.raw("0::int as sessions"),
            db.raw("0::int as test_attempts"),
            db.raw("0::int as revision_sessions"),
            db.raw("0::int as topics_revised")
        );

    // 4. Study sessions per day (session_date is already a plain date, no offset needed)
    const sessionsPerDay = db('revision.sessions as s')
        .join('revision.subjects as sub', 's.subject_id', 'sub.id')
        .where('sub.user_id', userId)
        .where('s.is_deleted', false)
        .where('sub.is_deleted', false)
        .whereRaw("s.session_date >= ?::date", [since])
        .groupByRaw("DATE(s.session_date)")
        .select(
            db.raw("DATE(s.session_date) as activity_date"),
            db.raw("0::int as notes"),
            db.raw("0::int as solutions"),
            db.raw("0::int as questions"),
            db.raw("COUNT(*)::int as sessions"),
            db.raw("0::int as test_attempts"),
            db.raw("0::int as revision_sessions"),
            db.raw("0::int as topics_revised")
        );

    // 5. Test attempts per day
    const testAttemptsPerDay = db('revision.test_results as tr')
        .join('revision.tests as t', 'tr.test_id', 't.id')
        .join('revision.test_series as ts', 't.test_series_id', 'ts.id')
        .where('ts.user_id', userId)
        .where('tr.is_deleted', false)
        .where('t.is_deleted', false)
        .whereRaw("tr.created_at >= ?::date", [since])
        .groupByRaw("DATE(tr.created_at)")
        .select(
            db.raw("DATE(tr.created_at) as activity_date"),
            db.raw("0::int as notes"),
            db.raw("0::int as solutions"),
            db.raw("0::int as questions"),
            db.raw("0::int as sessions"),
            db.raw("COUNT(*)::int as test_attempts"),
            db.raw("0::int as revision_sessions"),
            db.raw("0::int as topics_revised")
        );

    // 6. Revision sessions per day + topics revised count
    const revisionPerDay = db('revision.revision_sessions as rs')
        .leftJoin('revision.revision_session_tracker as rst', 'rst.revision_session_id', 'rs.id')
        .where('rs.user_id', userId)
        .whereRaw("rs.created_at >= ?::date", [since])
        .groupByRaw("DATE(rs.created_at)")
        .select(
            db.raw("DATE(rs.created_at) as activity_date"),
            db.raw("0::int as notes"),
            db.raw("0::int as solutions"),
            db.raw("0::int as questions"),
            db.raw("0::int as sessions"),
            db.raw("0::int as test_attempts"),
            db.raw("COUNT(DISTINCT rs.id)::int as revision_sessions"),
            db.raw("COUNT(CASE WHEN rst.status = 'completed' THEN 1 END)::int as topics_revised")
        );

    // UNION ALL and aggregate by date
    const raw = await db.raw(`
        SELECT 
            activity_date,
            SUM(notes) as notes,
            SUM(solutions) as solutions,
            SUM(questions) as questions,
            SUM(sessions) as sessions,
            SUM(test_attempts) as test_attempts,
            SUM(revision_sessions) as revision_sessions,
            SUM(topics_revised) as topics_revised
        FROM (
            (${notesPerDay.toQuery()})
            UNION ALL
            (${solutionsPerDay.toQuery()})
            UNION ALL
            (${questionsPerDay.toQuery()})
            UNION ALL
            (${sessionsPerDay.toQuery()})
            UNION ALL
            (${testAttemptsPerDay.toQuery()})
            UNION ALL
            (${revisionPerDay.toQuery()})
        ) as combined
        GROUP BY activity_date
        ORDER BY activity_date ASC
    `);

    return (raw.rows || []).map(row => ({
        date: row.activity_date instanceof Date ? row.activity_date.toISOString() : String(row.activity_date),
        notes: parseInt(row.notes || 0),
        solutions: parseInt(row.solutions || 0),
        questions: parseInt(row.questions || 0),
        sessions: parseInt(row.sessions || 0),
        testAttempts: parseInt(row.test_attempts || 0),
        revisionSessions: parseInt(row.revision_sessions || 0),
        topicsRevised: parseInt(row.topics_revised || 0),
    }));
};

/**
 * getMonthActivityDetail — fetches granular activity counts per subject for a specific month.
 */
export const getMonthActivityDetail = async (userId, month, year) => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];


    // 1. Fetch individual activity types grouped by subject AND date
    const notes = await db('revision.notes as n')
        .join('revision.subjects as sub', 'n.subject_id', 'sub.id')
        .where('sub.user_id', userId)
        .where('n.is_deleted', false)
        .where('sub.is_deleted', false)
        .whereBetween('n.created_at', [start + ' 00:00:00', end + ' 23:59:59'])
        .groupBy('sub.id', 'sub.name', db.raw('DATE(n.created_at)'))
        .select('sub.id', 'sub.name', db.raw('DATE(n.created_at) as activity_date'), db.raw('COUNT(*)::int as count'));

    const solutions = await db('revision.solutions as s')
        .join('revision.subjects as sub', 's.subject_id', 'sub.id')
        .where('sub.user_id', userId)
        .where('s.is_deleted', false)
        .where('sub.is_deleted', false)
        .whereBetween('s.created_at', [start + ' 00:00:00', end + ' 23:59:59'])
        .groupBy('sub.id', 'sub.name', db.raw('DATE(s.created_at)'))
        .select('sub.id', 'sub.name', db.raw('DATE(s.created_at) as activity_date'), db.raw('COUNT(*)::int as count'));

    const questions = await db('revision.questions as q')
        .join('revision.subjects as sub', 'q.subject_id', 'sub.id')
        .where('sub.user_id', userId)
        .where('q.is_deleted', false)
        .where('sub.is_deleted', false)
        .whereBetween('q.created_at', [start + ' 00:00:00', end + ' 23:59:59'])
        .groupBy('sub.id', 'sub.name', db.raw('DATE(q.created_at)'))
        .select('sub.id', 'sub.name', db.raw('DATE(q.created_at) as activity_date'), db.raw('COUNT(*)::int as count'));

    const sessions = await db('revision.sessions as s')
        .join('revision.subjects as sub', 's.subject_id', 'sub.id')
        .where('sub.user_id', userId)
        .where('s.is_deleted', false)
        .where('sub.is_deleted', false)
        .whereBetween('s.session_date', [start, end])
        .groupBy('sub.id', 'sub.name', db.raw('DATE(s.session_date)'))
        .select('sub.id', 'sub.name', db.raw('DATE(s.session_date) as activity_date'), db.raw('COUNT(*)::int as count'));

    const revisions = await db('revision.revision_sessions as rs')
        .join('revision.subjects as sub', 'rs.subject_id', 'sub.id')
        .leftJoin('revision.revision_session_tracker as rst', 'rst.revision_session_id', 'rs.id')
        .where('rs.user_id', userId)
        .where('sub.is_deleted', false)
        .whereBetween('rs.created_at', [start + ' 00:00:00', end + ' 23:59:59'])
        .groupBy('sub.id', 'sub.name', db.raw('DATE(rs.created_at)'))
        .select(
            'sub.id',
            'sub.name',
            db.raw('DATE(rs.created_at) as activity_date'),
            db.raw("COUNT(CASE WHEN rst.status = 'completed' THEN 1 END)::int as count")
        );

    const testAttempts = await db('revision.test_results as tr')
        .join('revision.tests as t', 'tr.test_id', 't.id')
        .join('revision.test_series as ts', 't.test_series_id', 'ts.id')
        .where('ts.user_id', userId)
        .where('tr.is_deleted', false)
        .where('t.is_deleted', false)
        .where('ts.is_deleted', false)
        .whereBetween('tr.created_at', [start + ' 00:00:00', end + ' 23:59:59'])
        .groupBy('ts.name', db.raw('DATE(tr.created_at)'))
        .select('ts.name', db.raw('DATE(tr.created_at) as activity_date'), db.raw('COUNT(*)::int as count'));

    // 2. Aggregate counts into a single structure
    const dailyData = {};
    const getDay = (date) => {
        const d = date instanceof Date ? date.toISOString() : String(date);
        if (!dailyData[d]) dailyData[d] = { subjects: {}, tests: [] };
        return dailyData[d];
    };
    const getSub = (dayObj, id, name) => {
        if (!dayObj.subjects[id]) dayObj.subjects[id] = { id, name, notes: 0, solutions: 0, questions: 0, sessions: 0, topics_revised: 0 };
        return dayObj.subjects[id];
    };

    notes.forEach(n => getSub(getDay(n.activity_date), n.id, n.name).notes = n.count);
    solutions.forEach(s => getSub(getDay(s.activity_date), s.id, s.name).solutions = s.count);
    questions.forEach(q => getSub(getDay(q.activity_date), q.id, q.name).questions = q.count);
    sessions.forEach(s => getSub(getDay(s.activity_date), s.id, s.name).sessions = s.count);
    revisions.forEach(r => getSub(getDay(r.activity_date), r.id, r.name).topics_revised = r.count);
    testAttempts.forEach(t => getDay(t.activity_date).tests.push({ name: t.name, count: t.count }));

    return {
        daily: dailyData,
        period: { month, year, start, end }
    };
};


