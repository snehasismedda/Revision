/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    await knex.schema.withSchema('revision').alterTable('session_entries', (t) => {
        t.dropUnique(['session_id', 'topic_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.withSchema('revision').alterTable('session_entries', (t) => {
        t.unique(['session_id', 'topic_id']);
    });
};
