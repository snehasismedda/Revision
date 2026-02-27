import db from '../db/knex.js';

export const createUser = async (data) => {
    const [user] = await db('revision.users')
        .insert({
            name: data.name,
            email: data.email,
            password_hash: data.passwordHash,
        })
        .returning(['id', 'name', 'email', 'created_at']);
    return user;
};

export const findUserByEmail = async (data) => {
    return db('revision.users')
        .where('email', data.email)
        .where('is_deleted', false)
        .first();
};

export const findUserById = async (data) => {
    return db('revision.users')
        .where('id', data.id)
        .where('is_deleted', false)
        .select(['id', 'name', 'email', 'created_at'])
        .first();
};

export const softDeleteUser = async (data) => {
    return db('revision.users')
        .where('id', data.id)
        .update({ is_deleted: true, deleted_at: new Date() });
};
