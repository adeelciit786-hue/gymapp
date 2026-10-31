import 'dotenv/config'
import { sql } from '../backend/database.js'

if (process.env.NODE_ENV !== 'development') {
  throw new Error('Admin bootstrap is available only when NODE_ENV=development.')
}

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Set BOOTSTRAP_ADMIN_EMAIL to an existing account email before running this command.')
}

const [member] = await sql`
  UPDATE users SET role = 'admin', updated_at = now()
  WHERE email = ${email}
  RETURNING email, role
`

if (!member) {
  throw new Error('No existing account matches BOOTSTRAP_ADMIN_EMAIL. Create an account first.')
}

console.log(`Administrator role granted to ${member.email}. No password or member data was changed.`)
