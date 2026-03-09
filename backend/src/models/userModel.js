import db from '../knex/db.js';

export const createUser = async (data) => {
    const [user] = await db('revision.users')
        .insert({
            name: data.name,
            email: data.email,
            password_hash: data.passwordHash,
        })
        .returning(['id', 'name', 'email', 'profile_picture', 'created_at']);
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
        .select(['id', 'name', 'email', 'profile_picture', 'created_at'])
        .first();
};

export const softDeleteUser = async (data) => {
    return db('revision.users')
        .where('id', data.id)
        .update({ is_deleted: true, deleted_at: new Date() });
};

export const updateUser = async (id, data) => {
    const updateData = { ...data, updated_at: db.fn.now() };
    const [user] = await db('revision.users')
        .where('id', id)
        .update(updateData)
        .returning(['id', 'name', 'email', 'profile_picture', 'created_at']);
    return user;
};
