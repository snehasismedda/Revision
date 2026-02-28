import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileName = '20260228224500_add_source_image_id_to_notes';

export async function up(knex) {
  const sql = fs.readFileSync(path.join(__dirname, `../sql/up/${fileName}_up.sql`), 'utf8');
  return knex.raw(sql);
}

export async function down(knex) {
  const sql = fs.readFileSync(path.join(__dirname, `../sql/down/${fileName}_down.sql`), 'utf8');
  return knex.raw(sql);
}
