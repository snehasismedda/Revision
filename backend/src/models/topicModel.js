import db from '../knex/db.js';

export const createTopic = async (data) => {
    const [topic] = await db('revision.topics')
        .insert({
            subject_id: data.subjectId,
            parent_id: data.parentId || null,
            name: data.name,
            order_index: data.orderIndex || 0,
        })
        .returning('*');
    return topic;
};

export const bulkCreateTopics = async (data) => {
    const rows = data.topics.map((t, i) => ({
        subject_id: data.subjectId,
        parent_id: t.parentId || null,
        name: t.name,
        order_index: t.orderIndex ?? i,
    }));
    return db('revision.topics').insert(rows).returning('*');
};

export const findTopicsBySubject = async (data) => {
    return db('revision.topics')
        .where('subject_id', data.subjectId)
        .where('is_deleted', false)
        .orderBy(['parent_id', 'order_index'])
        .select('*');
};

export const findTopicById = async (data) => {
    return db('revision.topics')
        .where('id', data.id)
        .where('is_deleted', false)
        .first();
};

export const updateTopic = async (data) => {
    const [updated] = await db('revision.topics')
        .where('id', data.id)
        .where('is_deleted', false)
        .update({
            name: data.name,
            order_index: data.orderIndex,
            updated_at: new Date(),
        })
        .returning('*');
    return updated;
};

export const softDeleteTopic = async (data) => {
    return db('revision.topics')
        .where('id', data.id)
        .update({ is_deleted: true, deleted_at: new Date() });
};

export const softDeleteTopicsBySubject = async (data) => {
    return db('revision.topics')
        .where('subject_id', data.subjectId)
        .update({ is_deleted: true, deleted_at: new Date() });
};

export const findSubTopics = async (parentId) => {
    return db('revision.topics')
        .where('parent_id', parentId)
        .where('is_deleted', false);
};

export const softDeleteSubTopics = async (parentId) => {
    return db('revision.topics')
        .where('parent_id', parentId)
        .update({ is_deleted: true, deleted_at: new Date() });
};
