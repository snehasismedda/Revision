import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function up(knex) {
    const sql = fs.readFileSync(path.join(__dirname, '../sql/up/20260309000000_add_tags_to_subjects_up.sql'), 'utf8');
    return knex.raw(sql);
}

export async function down(knex) {
    const sql = fs.readFileSync(path.join(__dirname, '../sql/down/20260309000000_add_tags_to_subjects_down.sql'), 'utf8');
    return knex.raw(sql);
}
