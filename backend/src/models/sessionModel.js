import db from '../knex/db.js';

export const createSession = async (data) => {
    const [session] = await db('revision.sessions')
        .insert({
            subject_id: data.subjectId,
            title: data.title,
            notes: data.notes || null,
            session_date: data.sessionDate || new Date(),
        })
        .returning('*');
    return session;
};

export const findSessionsBySubject = async (data) => {
    return db('revision.sessions as s')
        .leftJoin('revision.session_entries as se', function () {
            this.on('se.session_id', 's.id').andOn('se.is_deleted', db.raw('false'));
        })
        .where('s.subject_id', data.subjectId)
        .where('s.is_deleted', false)
        .groupBy('s.id', 's.subject_id', 's.title', 's.notes', 's.session_date', 's.created_at')
        .select([
            's.id', 's.subject_id', 's.title', 's.notes', 's.session_date', 's.created_at',
            db.raw('COALESCE(COUNT(se.id), 0)::int as total_questions'),
            db.raw('COALESCE(SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END), 0)::int as total_correct'),
            db.raw('COALESCE(COUNT(se.id) - SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END), 0)::int as total_incorrect'),
            db.raw('CASE WHEN COUNT(se.id) > 0 THEN ROUND(100.0 * SUM(CASE WHEN se.is_correct THEN 1 ELSE 0 END) / COUNT(se.id), 1) ELSE 0 END as accuracy'),
        ])
        .orderBy('s.session_date', 'desc');
};

export const findSessionById = async (data) => {
    return db('revision.sessions')
        .where('id', data.id)
        .where('is_deleted', false)
        .first();
};

export const findSessionWithEntries = async (data) => {
    const session = await db('revision.sessions')
        .where('revision.sessions.id', data.id)
        .where('revision.sessions.is_deleted', false)
        .first();

    if (!session) return null;

    const entries = await db('revision.session_entries as se')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('se.session_id', data.id)
        .where('se.is_deleted', false)
        .select([
            'se.id', 'se.topic_id', 'se.is_correct',
            't.name as topic_name', 't.parent_id',
        ]);

    return { ...session, entries };
};

export const updateSession = async (data) => {
    const [updated] = await db('revision.sessions')
        .where('id', data.id)
        .where('is_deleted', false)
        .update({
            title: data.title,
            notes: data.notes,
            session_date: data.sessionDate,
            updated_at: new Date(),
        })
        .returning('*');
    return updated;
};

export const softDeleteSession = async (data) => {
    return db('revision.sessions')
        .where('id', data.id)
        .update({ is_deleted: true, deleted_at: new Date() });
};

export const softDeleteSessionsBySubject = async (data) => {
    return db('revision.sessions')
        .where('subject_id', data.subjectId)
        .update({ is_deleted: true, deleted_at: new Date() });
};

export const findEntriesBySessionId = async (data) => {
    return db('revision.session_entries as se')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('se.session_id', data.sessionId)
        .where('se.is_deleted', false)
        .select([
            'se.id', 'se.topic_id', 'se.is_correct',
            't.name as topic_name', 't.parent_id',
        ]);
};
