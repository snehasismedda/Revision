import db from '../knex/db.js';

export const createTimeTable = async (data) => {
    // Check if user is creating an active time table
    if (data.is_active) {
        await db('revision.time_tables')
            .where({ user_id: data.user_id })
            .update({ is_active: false });
    }

    const [timeTable] = await db('revision.time_tables')
        .insert(data)
        .returning('*');
    return timeTable;
};

export const getTimeTables = async (user_id) => {
    return await db('revision.time_tables')
        .where({ user_id, is_deleted: false })
        .orderBy('created_at', 'desc');
};

export const getTimeTableById = async (id, user_id) => {
    return await db('revision.time_tables')
        .where({ id, user_id, is_deleted: false })
        .first();
};

export const deleteTimeTable = async (id, user_id) => {
    const [timeTable] = await db('revision.time_tables')
        .where({ id, user_id })
        .update({ is_deleted: true, deleted_at: new Date() })
        .returning('*');
    return timeTable;
};

export const updateTimeTable = async (id, user_id, data) => {
    if (data.is_active) {
        await db('revision.time_tables')
            .where({ user_id })
            .update({ is_active: false });
    }

    const [timeTable] = await db('revision.time_tables')
        .where({ id, user_id, is_deleted: false })
        .update({ ...data, updated_at: new Date() })
        .returning('*');
    return timeTable;
};

export const setActiveTimeTable = async (id, user_id) => {
    await db('revision.time_tables')
        .where({ user_id })
        .update({ is_active: false });
    
    const [timeTable] = await db('revision.time_tables')
        .where({ id, user_id, is_deleted: false })
        .update({ is_active: true, updated_at: new Date() })
        .returning('*');
    return timeTable;
};

export const toggleActiveTimeTable = async (id, user_id) => {
    const current = await db('revision.time_tables')
        .where({ id, user_id, is_deleted: false })
        .first();
    if (!current) return null;

    // Always unset all first
    await db('revision.time_tables')
        .where({ user_id })
        .update({ is_active: false });

    // If it was inactive, activate it; if it was already active, leave all inactive
    if (!current.is_active) {
        const [timeTable] = await db('revision.time_tables')
            .where({ id, user_id, is_deleted: false })
            .update({ is_active: true, updated_at: new Date() })
            .returning('*');
        return timeTable;
    }

    return await db('revision.time_tables')
        .where({ id, user_id, is_deleted: false })
        .first();
};
