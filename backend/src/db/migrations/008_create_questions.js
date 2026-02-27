export const up = async (knex) => {
    await knex.schema.createTable('questions', (table) => {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());
        table.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE').notNullable();
        table.uuid('topic_id').references('id').inTable('topics').onDelete('SET NULL').nullable(); // Optional: attached to a topic
        table.text('content').notNullable();
        table.enum('type', ['text', 'image']).defaultTo('text').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

export const down = async (knex) => {
    await knex.schema.dropTableIfExists('questions');
};
