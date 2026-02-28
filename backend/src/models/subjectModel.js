import db from '../knex/db.js';

export const createSubject = async (data) => {
    const [subject] = await db('revision.subjects')
        .insert({
            user_id: data.userId,
            name: data.name,
            description: data.description || null,
        })
        .returning('*');
    return subject;
};

export const findSubjectsByUser = async (data) => {
    return db('revision.subjects')
        .where('user_id', data.userId)
        .where('is_deleted', false)
        .select([
            'id', 'name', 'description', 'created_at',
        ])
        .orderBy('created_at', 'desc');
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
