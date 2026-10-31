import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Add your Neon connection string to .env.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
let stage = 'schema'

async function runFile(path) {
  const contents = await readFile(new URL(path, import.meta.url), 'utf8')
  const statements = contents.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean)
  for (const statement of statements) await sql.query(statement)
}

try {
  await runFile('../db/schema.sql')
  stage = 'seed data'
  await runFile('../db/seed.sql')
  stage = 'row count verification'
  const rows = await sql`
    SELECT
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM exercises) AS exercises,
      (SELECT count(*)::int FROM classes WHERE start_time >= date_trunc('week', now()) AND start_time < date_trunc('week', now()) + interval '7 days') AS classes_this_week,
      (SELECT count(*)::int FROM membership_plans WHERE active) AS plans
  `
  console.log('Database setup complete (existing member data preserved).')
  console.log(JSON.stringify(rows[0]))
} catch (error) {
  console.error(`Database setup failed during ${stage} (${error?.code || error?.name || 'database error'}). Check Neon availability, connection settings, and schema permissions. Connection details are suppressed.`)
  process.exitCode = 1
}
