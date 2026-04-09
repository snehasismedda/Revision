import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function up(knex) {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/up/20260408230250_rename_source_image_id_to_plural_in_notes_up.sql'), 'utf8');
  return knex.raw(sql);
}

export async function down(knex) {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/down/20260408230250_rename_source_image_id_to_plural_in_notes_down.sql'), 'utf8');
  return knex.raw(sql);
}
