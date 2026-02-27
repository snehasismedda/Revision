export const up = async (knex) => {
    await knex.schema.withSchema('revision').createTable('sessions', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        t.uuid('subject_id').notNullable().references('id').inTable('revision.subjects').onDelete('CASCADE');
        t.string('title').notNullable();
        t.text('notes');
        t.date('session_date').notNullable().defaultTo(knex.fn.now());
        t.boolean('is_deleted').notNullable().defaultTo(false);
        t.timestamp('deleted_at');
        t.timestamps(true, true);
    });
};

export const down = async (knex) => {
    await knex.schema.withSchema('revision').dropTableIfExists('sessions');
};
