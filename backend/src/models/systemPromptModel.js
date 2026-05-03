import db from '../knex/db.js';

export const getSystemPromptsByUser = async (userId) => {
    return await db('revision.system_prompts')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc');
};

export const createSystemPrompt = async (userId, name, prompt, isDefault = false, version = '1.0') => {
    // If setting as default, unset other defaults for this user
    if (isDefault) {
        await db('revision.system_prompts')
            .where({ user_id: userId })
            .update({ is_default: false });
    }

    const [newPrompt] = await db('revision.system_prompts').insert({
        user_id: userId,
        name,
        prompt,
        is_default: isDefault,
        version
    }).returning('*');
    return newPrompt;
};

export const updateSystemPrompt = async (id, userId, data) => {
    // If setting as default, unset other defaults for this user
    if (data.is_default) {
        await db('revision.system_prompts')
            .where({ user_id: userId })
            .whereNot({ id })
            .update({ is_default: false });
    }

    const [updated] = await db('revision.system_prompts')
        .where({ id, user_id: userId })
        .update({
            ...data,
            updated_at: db.fn.now()
        })
        .returning('*');
    return updated;
};

export const deleteSystemPrompt = async (id, userId) => {
    return await db('revision.system_prompts')
        .where({ id, user_id: userId })
        .del();
};
