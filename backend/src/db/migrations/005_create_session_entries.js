export const up = async (knex) => {
    await knex.schema.withSchema('revision').createTable('session_entries', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        t.uuid('session_id').notNullable().references('id').inTable('revision.sessions').onDelete('CASCADE');
        t.uuid('topic_id').notNullable().references('id').inTable('revision.topics').onDelete('CASCADE');
        t.boolean('is_correct').notNullable().defaultTo(false);
        t.boolean('is_deleted').notNullable().defaultTo(false);
        t.timestamp('deleted_at');
        t.timestamps(true, true);
        t.unique(['session_id', 'topic_id']);
    });
};

export const down = async (knex) => {
    await knex.schema.withSchema('revision').dropTableIfExists('session_entries');
};
