import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { neon } from '@neondatabase/serverless'

if (process.env.NODE_ENV !== 'development') {
  console.error('Refusing to create a predictable test account unless NODE_ENV=development.')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Add your Neon connection string to .env.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const passwordHash = await bcrypt.hash('Test1234!', 12)
try {
  const rows = await sql`
    WITH member AS (
      INSERT INTO users (email, password_hash, full_name, weekly_goal_workouts, weekly_goal_minutes)
      VALUES ('test@forge.local', ${passwordHash}, 'FORGE. Test Member', 3, 150)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    ), existing AS (
      SELECT id FROM users WHERE email = 'test@forge.local'
    ), target AS (
      SELECT id FROM member
      UNION ALL
      SELECT id FROM existing WHERE NOT EXISTS (SELECT 1 FROM member)
    )
    INSERT INTO user_profiles (user_id)
    SELECT id FROM target
    ON CONFLICT (user_id) DO NOTHING
    RETURNING user_id
  `
  console.log(rows.length ? 'Development test account created.' : 'Development test account already exists; no account data changed.')
} catch (error) {
  console.error(`Test account setup failed (${error?.code || error?.name || 'database error'}). Check Neon availability and schema permissions. Connection details are suppressed.`)
  process.exitCode = 1
}
