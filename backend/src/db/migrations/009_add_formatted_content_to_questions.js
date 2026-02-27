export const up = async (knex) => {
    // Check if column exists first to avoid errors if already added
    const hasColumn = await knex.schema.hasColumn('questions', 'formatted_content');
    if (!hasColumn) {
        await knex.schema.table('questions', (table) => {
            table.jsonb('formatted_content').nullable();
        });
    }
};

export const down = async (knex) => {
    await knex.schema.table('questions', (table) => {
        table.dropColumn('formatted_content');
    });
};
