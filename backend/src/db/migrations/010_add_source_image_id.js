export const up = async (knex) => {
    const hasColumn = await knex.schema.hasColumn('questions', 'source_image_id');
    if (!hasColumn) {
        await knex.schema.table('questions', (table) => {
            // Points to another question's ID that holds the original image.
            // When an image contains multiple questions, the first question
            // stores the actual base64 image data and all sibling questions
            // point to its ID via source_image_id.
            table.uuid('source_image_id').nullable()
                .references('id').inTable('questions').onDelete('SET NULL');
        });
    }
};

export const down = async (knex) => {
    const hasColumn = await knex.schema.hasColumn('questions', 'source_image_id');
    if (hasColumn) {
        await knex.schema.table('questions', (table) => {
            table.dropColumn('source_image_id');
        });
    }
};
