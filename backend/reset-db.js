import postgres from 'postgres';

const sql = postgres('postgres://skinai:skinai_dev@127.0.0.1:5433/skinai_dev');

async function resetDb() {
  try {
    await sql`DROP SCHEMA public CASCADE;`;
    await sql`CREATE SCHEMA public;`;
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`;
    console.log('Database schema reset successfully.');
  } catch (error) {
    console.error('Error resetting DB:', error);
  } finally {
    await sql.end();
  }
}

resetDb();
