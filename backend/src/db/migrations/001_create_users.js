export const up = async (knex) => {
    await knex.raw('CREATE SCHEMA IF NOT EXISTS revision');

    await knex.schema.withSchema('revision').createTable('users', (t) => {
        t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        t.string('name').notNullable();
        t.string('email').notNullable().unique();
        t.string('password_hash').notNullable();
        t.boolean('is_deleted').notNullable().defaultTo(false);
        t.timestamp('deleted_at');
        t.timestamps(true, true);
    });
};

export const down = async (knex) => {
    await knex.schema.withSchema('revision').dropTableIfExists('users');
};
