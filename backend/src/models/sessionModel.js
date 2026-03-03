import db from '../knex/db.js';

export const createSession = async (data) => {
    const [session] = await db('revision.sessions')
        .insert({
            subject_id: data.subjectId || null,
            test_id: data.testId || null,
            title: data.title,
            notes: data.notes || null,
            session_date: data.sessionDate || new Date(),
        })
        .returning('*');
    return session;
};

export const findSessionByTestId = async (testId) => {
    return db('revision.sessions')
        .where('test_id', testId)
        .where('is_deleted', false)
        .first();
};


export const findSessionsBySubject = async (data) => {
    // We want sessions where either session.subject_id matches, 
    // OR at least one entry in the session belongs to a topic in this subject.
    const subquery = db('revision.session_entries as se')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('t.subject_id', data.subjectId)
        .where('se.is_deleted', false)
        .select('se.session_id');

    return db('revision.sessions as s')
        .leftJoin('revision.session_entries as se_all', function () {
            this.on('se_all.session_id', 's.id').andOn('se_all.is_deleted', db.raw('false'));
        })
        .where(function () {
            this.where('s.subject_id', data.subjectId)
                .orWhereIn('s.id', subquery);
        })
        .where('s.is_deleted', false)
        .groupBy('s.id', 's.subject_id', 's.test_id', 's.title', 's.notes', 's.session_date', 's.created_at')
        .select([
            's.id', 's.subject_id', 's.test_id', 's.title', 's.notes', 's.session_date', 's.created_at',
            db.raw('COUNT(se_all.id)::int as total_questions'),
            db.raw('SUM(CASE WHEN se_all.is_correct THEN 1 ELSE 0 END)::int as total_correct'),
            db.raw('COUNT(se_all.id) - SUM(CASE WHEN se_all.is_correct THEN 1 ELSE 0 END)::int as total_incorrect'),
            db.raw('CASE WHEN COUNT(se_all.id) > 0 THEN ROUND(100.0 * SUM(CASE WHEN se_all.is_correct THEN 1 ELSE 0 END) / COUNT(se_all.id), 1) ELSE 0 END as accuracy'),
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
