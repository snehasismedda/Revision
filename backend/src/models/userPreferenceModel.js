import db from '../knex/db.js';

export const getPreference = async (userId) => {
    return db('revision.user_preferences')
        .where('user_id', userId)
        .first();
};

export const updatePreference = async (userId, data) => {
    try {
        const existing = await getPreference(userId);
        if (existing) {
            const [pref] = await db('revision.user_preferences')
                .where('user_id', userId)
                .update({ ...data, updated_at: db.fn.now() })
                .returning(['font_size', 'code_font_size', 'line_height', 'primary_color_light', 'primary_color_dark']);
            return pref;
        } else {
            const [pref] = await db('revision.user_preferences')
                .insert({ user_id: userId, ...data })
                .returning(['font_size', 'code_font_size', 'line_height', 'primary_color_light', 'primary_color_dark']);
            return pref;
        }
    } catch (error) {
        console.error('Error updating preference:', error);
        throw error;
    }
};
