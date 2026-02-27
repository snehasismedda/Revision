export const up = async (knex) => {
    await knex.schema.withSchema('revision').createTable('subjects', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        t.uuid('user_id').notNullable().references('id').inTable('revision.users').onDelete('CASCADE');
        t.string('name').notNullable();
        t.text('description');
        t.boolean('is_deleted').notNullable().defaultTo(false);
        t.timestamp('deleted_at');
        t.timestamps(true, true);
    });
};

export const down = async (knex) => {
    await knex.schema.withSchema('revision').dropTableIfExists('subjects');
};
