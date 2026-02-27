import db from './src/db/knex.js';

async function run() {
  try {
    const res = await db.raw("SELECT * FROM revision.knex_migrations;");
    console.log("Migs in revision:", res.rows);
  } catch (e) {
    console.log("err revision:", e.message);
  }
  try {
    const res2 = await db.raw("SELECT * FROM public.knex_migrations;");
    console.log("Migs in public:", res2.rows);
  } catch (e) {
    console.log("err public:", e.message);
  }
  process.exit(0);
}
run();
