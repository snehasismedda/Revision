/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function (knex) {
    return knex.schema.createTable('notes', (table) => {
        table.uuid('id').defaultTo(knex.fn.uuid()).primary();
        table.uuid('subject_id').notNullable().references('id').inTable('subjects').onDelete('CASCADE');
        table.uuid('question_id').references('id').inTable('questions').onDelete('SET NULL');

        table.string('title').notNullable();
        table.text('content').notNullable();

        table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function (knex) {
    return knex.schema.dropTableIfExists('notes');
};
