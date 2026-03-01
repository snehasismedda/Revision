import db from '../knex/db.js';

export const getSubjectOverview = async (data) => {
    const attempts = await db('revision.session_entries as se')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('s.subject_id', data.subjectId)
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

    return {
        total_questions: attempts?.total_questions || 0,
        total_correct: attempts?.total_correct || 0,
        topics_covered: attempts?.topics_covered || 0,
        available_questions: qs?.count || 0,
        total_sessions: sess?.count || 0,
    };
};

export const getTopicPerformance = async (data) => {
    return db('revision.session_entries as se')
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('s.subject_id', data.subjectId)
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
        .where('s.subject_id', data.subjectId)
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
        .where('s.subject_id', data.subjectId)
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
        .join('revision.sessions as s', 'se.session_id', 's.id')
        .join('revision.subjects as sub', 's.subject_id', 'sub.id')
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
        .join('revision.subjects as sub', 's.subject_id', 'sub.id')
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
