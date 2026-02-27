import db from './src/db/knex.js';

async function run() {
    try {
        const exists = await db.schema.hasTable('questions');
        if (!exists) {
            await db.schema.createTable('questions', (table) => {
                table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
                table.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE').notNullable();
                table.uuid('topic_id').references('id').inTable('topics').onDelete('SET NULL').nullable();
                table.text('content').notNullable();
                table.enum('type', ['text', 'image']).defaultTo('text').notNullable();
                table.timestamp('created_at').defaultTo(db.raw('CURRENT_TIMESTAMP'));
                table.timestamp('updated_at').defaultTo(db.raw('CURRENT_TIMESTAMP'));
            });
            console.log('Table questions created successfully.');
        } else {
            console.log('Table questions already exists.');
        }
    } catch (e) {
        console.error('Error creating table:', e);
    } finally {
        process.exit(0);
    }
}
run();
