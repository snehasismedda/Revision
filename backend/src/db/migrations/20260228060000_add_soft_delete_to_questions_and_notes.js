/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    await knex.schema.table('questions', (table) => {
        table.boolean('is_deleted').notNullable().defaultTo(false);
        table.timestamp('deleted_at');
    });

    await knex.schema.table('notes', (table) => {
        table.boolean('is_deleted').notNullable().defaultTo(false);
        table.timestamp('deleted_at');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    await knex.schema.table('questions', (table) => {
        table.dropColumn('is_deleted');
        table.dropColumn('deleted_at');
    });

    await knex.schema.table('notes', (table) => {
        table.dropColumn('is_deleted');
        table.dropColumn('deleted_at');
    });
};
