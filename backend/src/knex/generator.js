import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrationName = process.argv.slice(2).join('_');

if (!migrationName) {
    console.error('Please provide a migration name');
    process.exit(1);
}


const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
const fileName = `${timestamp}_${migrationName}`;

// Paths
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SQL_UP_DIR = path.join(__dirname, 'sql/up');
const SQL_DOWN_DIR = path.join(__dirname, 'sql/down');

// Content for the migration wrapper
const wrapperContent = `import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function up(knex) {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/up/${fileName}_up.sql'), 'utf8');
  return knex.raw(sql);
}

export async function down(knex) {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/down/${fileName}_down.sql'), 'utf8');
  return knex.raw(sql);
}
`;

// Ensure directories exist
[MIGRATIONS_DIR, SQL_UP_DIR, SQL_DOWN_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Write Files
fs.writeFileSync(path.join(MIGRATIONS_DIR, `${fileName}.js`), wrapperContent);
fs.writeFileSync(path.join(SQL_UP_DIR, `${fileName}_up.sql`), `-- Up migration for ${migrationName}\n`);
fs.writeFileSync(path.join(SQL_DOWN_DIR, `${fileName}_down.sql`), `-- Down migration for ${migrationName}\n`);

console.log(`Generated:
- src/knex/migrations/${fileName}.js
- src/knex/sql/up/${fileName}_up.sql
- src/knex/sql/down/${fileName}_down.sql
`);
