import db from '../knex/db.js';

export const bulkCreateEntries = async (data) => {
    const rows = data.entries.map((e) => ({
        session_id: data.sessionId,
        topic_id: e.topicId,
        is_correct: e.isCorrect,
    }));
    return db('revision.session_entries').insert(rows).returning('*');
};

export const replaceSessionEntries = async (data) => {
    await db('revision.session_entries')
        .where('session_id', data.sessionId)
        .update({ is_deleted: true, deleted_at: new Date() });

    const rows = data.entries.map((e) => ({
        session_id: data.sessionId,
        topic_id: e.topicId,
        is_correct: e.isCorrect,
    }));
    return db('revision.session_entries').insert(rows).returning('*');
};

export const findEntriesBySession = async (data) => {
    return db('revision.session_entries as se')
        .join('revision.topics as t', 'se.topic_id', 't.id')
        .where('se.session_id', data.sessionId)
        .where('se.is_deleted', false)
        .select([
            'se.id', 'se.topic_id', 'se.is_correct',
            't.name as topic_name', 't.parent_id',
        ]);
};

export const softDeleteEntriesBySessions = async (sessionIds) => {
    const idList = Array.isArray(sessionIds) ? sessionIds : [sessionIds];
    if (idList.length === 0) return;

    return db('revision.session_entries')
        .whereIn('session_id', idList)
        .update({ is_deleted: true, deleted_at: new Date() });
};


export const softDeleteEntriesByTopics = async (topicIds) => {
    const idList = Array.isArray(topicIds) ? topicIds : [topicIds];
    if (idList.length === 0) return;

    return db('revision.session_entries')
        .whereIn('topic_id', idList)
        .update({ is_deleted: true, deleted_at: new Date() });
};

