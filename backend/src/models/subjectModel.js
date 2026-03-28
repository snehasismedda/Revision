import db from '../knex/db.js';

export const createSubject = async (data) => {
    const [subject] = await db('revision.subjects')
        .insert({
            user_id: data.userId,
            name: data.name,
            description: data.description || null,
            tags: JSON.stringify(Array.isArray(data.tags) ? data.tags : []),
        })
        .returning('*');
    return subject;
};

export const findSubjectsByUser = async (data) => {
    return db('revision.subjects')
        .where('user_id', data.userId)
        .where('is_deleted', false)
        .select([
            'id', 'name', 'description', 'tags', 'is_archived', 'created_at', 'updated_at',
        ])
        .orderBy('updated_at', 'desc');
};

export const touchSubject = async (id) => {
    return db('revision.subjects')
        .where('id', id)
        .update({ updated_at: new Date() });
};

export const findSubjectById = async (data) => {
    return db('revision.subjects')
        .where('id', data.id)
        .where('is_deleted', false)
        .first();
};

export const findSubjectByIdAndUser = async (data) => {
    return db('revision.subjects')
        .where('id', data.id)
        .where('user_id', data.userId)
        .where('is_deleted', false)
        .first();
};

export const updateSubject = async (data) => {
    const [updated] = await db('revision.subjects')
        .where('id', data.id)
        .where('user_id', data.userId)
        .where('is_deleted', false)
        .update({
            name: data.name,
            description: data.description,
            tags: JSON.stringify(Array.isArray(data.tags) ? data.tags : []),
            is_archived: data.isArchived !== undefined ? data.isArchived : db.raw('is_archived'),
            updated_at: new Date(),
        })
        .returning('*');
    return updated;
};

export const softDeleteSubject = async (data) => {
    return db('revision.subjects')
        .where('id', data.id)
        .where('user_id', data.userId)
        .update({ is_deleted: true, deleted_at: new Date() });
};
