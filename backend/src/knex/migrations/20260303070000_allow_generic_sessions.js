import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function up(knex) {
    const sql = fs.readFileSync(path.join(__dirname, '../sql/up/20260303070000_allow_generic_sessions_up.sql'), 'utf8');
    return knex.raw(sql);
}

export async function down(knex) {
    const sql = fs.readFileSync(path.join(__dirname, '../sql/down/20260303070000_allow_generic_sessions_down.sql'), 'utf8');
    return knex.raw(sql);
}
