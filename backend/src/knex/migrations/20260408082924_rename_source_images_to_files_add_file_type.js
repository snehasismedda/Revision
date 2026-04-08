import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function up(knex) {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/up/20260408082924_rename_source_images_to_files_add_file_type_up.sql'), 'utf8');
  return knex.raw(sql);
}

export async function down(knex) {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/down/20260408082924_rename_source_images_to_files_add_file_type_down.sql'), 'utf8');
  return knex.raw(sql);
}
