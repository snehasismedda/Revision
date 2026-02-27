export const up = async (knex) => {
    await knex.schema.withSchema('revision').createTable('topics', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        t.uuid('subject_id').notNullable().references('id').inTable('revision.subjects').onDelete('CASCADE');
        t.uuid('parent_id').nullable().references('id').inTable('revision.topics').onDelete('CASCADE');
        t.string('name').notNullable();
        t.integer('order_index').notNullable().defaultTo(0);
        t.boolean('is_deleted').notNullable().defaultTo(false);
        t.timestamp('deleted_at');
        t.timestamps(true, true);
    });
};

export const down = async (knex) => {
    await knex.schema.withSchema('revision').dropTableIfExists('topics');
};
