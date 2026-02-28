/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    await knex.schema.table('questions', (table) => {
        table.jsonb('tags').defaultTo('[]');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.table('questions', (table) => {
        table.dropColumn('tags');
    });
};
