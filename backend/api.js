import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { sql } from './database.js'

const TOKEN_COOKIE = 'forge_session'
const TOKEN_AGE_SECONDS = 60 * 60 * 24
const jwtKey = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.')
  return new TextEncoder().encode(process.env.JWT_SECRET)
}
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const muscles = new Set(['Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio'])
const difficulties = new Set(['Beginner', 'Intermediate', 'Advanced'])
const publicUser = ({ id, email, full_name, weekly_goal_workouts, weekly_goal_minutes, role }) => ({
  id, email, fullName: full_name, weeklyGoalWorkouts: weekly_goal_workouts, weeklyGoalMinutes: weekly_goal_minutes, role,
})
const respond = (res, data, status = 200) => res.status(status).json({ data })
const fail = (res, status, message) => res.status(status).json({ error: { message } })
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

function originAllowed(req) {
  const origin = req.get('origin')
  if (!origin) return false
  const allowed = new Set([
    process.env.APP_ORIGIN,
    `${req.protocol}://${req.get('host')}`,
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ].filter(Boolean))
  return allowed.has(origin)
}

function csrfGuard(req, res, next) {
  if (!originAllowed(req)) return fail(res, 403, 'Request origin is not allowed.')
  next()
}

const authAttempts = new Map()
function authRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const current = authAttempts.get(key)
  if (!current || now - current.startedAt >= 15 * 60 * 1000) {
    authAttempts.set(key, { startedAt: now, count: 1 })
    return next()
  }
  current.count += 1
  if (current.count > 10) return fail(res, 429, 'Too many authentication attempts. Try again later.')
  next()
}

async function requireAuth(req, res, next) {
  const token = req.cookies?.[TOKEN_COOKIE]
  if (!token) return fail(res, 401, 'Please sign in to continue.')
  let subject
  let tokenVersion
  try {
    const { payload } = await jwtVerify(token, jwtKey(), { algorithms: ['HS256'] })
    if (typeof payload.sub !== 'string') return fail(res, 401, 'Please sign in to continue.')
    subject = payload.sub
    tokenVersion = payload.sessionVersion
  } catch {
    res.clearCookie(TOKEN_COOKIE, cookieOptions())
    return fail(res, 401, 'Your session has expired. Please sign in again.')
  }
  const [member] = await sql`SELECT role, active, session_version FROM users WHERE id = ${subject}`
  if (!member?.active || (tokenVersion !== undefined && tokenVersion !== member.session_version) ||
    (tokenVersion === undefined && member.session_version !== 0)) {
    res.clearCookie(TOKEN_COOKIE, cookieOptions())
    return fail(res, 401, 'This account is unavailable. Please contact the gym.')
  }
  req.userId = subject
  req.userRole = member.role
  next()
}

async function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') return fail(res, 403, 'Administrator access is required.')
  next()
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

async function updateAchievements(userId) {
  return sql`
    WITH measures AS (
      SELECT 'workouts'::text AS criterion, count(*)::int AS value
        FROM workouts WHERE user_id = ${userId} AND status = 'completed'
      UNION ALL SELECT 'minutes', coalesce(sum(duration_minutes), 0)::int
        FROM workouts WHERE user_id = ${userId} AND status = 'completed'
      UNION ALL SELECT 'bookings', count(*)::int
        FROM class_bookings WHERE user_id = ${userId} AND booking_status IN ('booked', 'cancelled')
      UNION ALL SELECT 'records', count(DISTINCT (exercise_id, record_type))::int
        FROM personal_records WHERE user_id = ${userId}
    ), eligible AS (
      SELECT a.id, a.title FROM achievement_catalog a JOIN measures m USING (criterion)
      WHERE m.value >= a.threshold
    ), awarded AS (
      INSERT INTO user_achievements(user_id, achievement_id)
      SELECT ${userId}, id FROM eligible ON CONFLICT DO NOTHING
      RETURNING achievement_id
    )
    INSERT INTO notifications(user_id, title, message)
    SELECT ${userId}, 'Achievement unlocked', a.title
    FROM awarded u JOIN achievement_catalog a ON a.id = u.achievement_id
    RETURNING message AS title
  `
}

async function writeAudit(actorId, action, recordType, recordId, metadata = {}) {
  await sql`
    INSERT INTO audit_logs(actor_user_id, action, record_type, record_id, metadata)
    VALUES (${actorId}, ${action}, ${recordType}, ${recordId}, ${JSON.stringify(metadata)}::jsonb)
  `
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TOKEN_AGE_SECONDS * 1000,
  }
}

async function issueSession(res, user) {
  const token = await new SignJWT({ email: user.email, sessionVersion: user.session_version ?? 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_AGE_SECONDS}s`)
    .sign(jwtKey())
  res.cookie(TOKEN_COOKIE, token, cookieOptions())
}

export function createApiApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '32kb' }))
  app.use(cookieParser())
  app.use((req, _res, next) => {
    const requestUrl = new URL(req.url, 'http://forge.local')
    const vercelPath = requestUrl.searchParams.get('__api_path')
    if (vercelPath) {
      requestUrl.searchParams.delete('__api_path')
      req.url = `${vercelPath}${requestUrl.search}`
    } else if (requestUrl.pathname.startsWith('/api/')) {
      req.url = `${requestUrl.pathname.slice(4)}${requestUrl.search}`
    }
    next()
  })
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    if (!req.path.startsWith('/auth/') || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next()
    csrfGuard(req, res, next)
  })

  app.get('/health', asyncRoute(async (_req, res) => {
    const rows = await sql`SELECT 1 AS connected`
    respond(res, { status: rows[0].connected === 1 ? 'ok' : 'unavailable' })
  }))

  app.post('/auth/signup', authRateLimit, asyncRoute(async (req, res) => {
    const name = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : ''
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = req.body?.password
    const weeklyWorkouts = Number(req.body?.weeklyGoalWorkouts ?? 3)
    const weeklyMinutes = Number(req.body?.weeklyGoalMinutes ?? 150)
    if (name.length < 2 || name.length > 100 || !emailPattern.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 72 ||
      !Number.isInteger(weeklyWorkouts) || weeklyWorkouts < 1 || weeklyWorkouts > 7 ||
      !Number.isInteger(weeklyMinutes) || weeklyMinutes < 1 || weeklyMinutes > 2000) {
      return fail(res, 400, 'Enter a valid name, email, password and weekly goal.')
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const inserted = await sql`
      WITH new_user AS (
        INSERT INTO users (email, password_hash, full_name, weekly_goal_workouts, weekly_goal_minutes)
        VALUES (${email}, ${passwordHash}, ${name}, ${weeklyWorkouts}, ${weeklyMinutes})
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, full_name, weekly_goal_workouts, weekly_goal_minutes, role, session_version
      )
      INSERT INTO user_profiles (user_id)
      SELECT id FROM new_user
      RETURNING user_id
    `
    if (!inserted.length) return fail(res, 409, 'An account with that email already exists.')
    const [user] = await sql`SELECT id, email, full_name, weekly_goal_workouts, weekly_goal_minutes, role, session_version FROM users WHERE id = ${inserted[0].user_id}`
    await issueSession(res, user)
    respond(res, { user: publicUser(user) }, 201)
  }))

  app.post('/auth/login', authRateLimit, asyncRoute(async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = req.body?.password
    const [user] = await sql`SELECT id, email, password_hash, full_name, weekly_goal_workouts, weekly_goal_minutes, role, active, session_version FROM users WHERE email = ${email}`
    const matches = user?.active && typeof password === 'string' ? await bcrypt.compare(password, user.password_hash) : false
    if (!matches) return fail(res, 401, 'Email or password is incorrect.')
    await issueSession(res, user)
    respond(res, { user: publicUser(user) })
  }))

  app.post('/auth/logout', csrfGuard, (_req, res) => {
    res.clearCookie(TOKEN_COOKIE, cookieOptions())
    respond(res, { loggedOut: true })
  })

  app.get('/auth/me', asyncRoute(async (req, res) => {
    const token = req.cookies?.[TOKEN_COOKIE]
    if (!token) return respond(res, { user: null })
    let subject
    let tokenVersion
    try {
      const { payload } = await jwtVerify(token, jwtKey(), { algorithms: ['HS256'] })
      if (typeof payload.sub !== 'string') return respond(res, { user: null })
      subject = payload.sub
      tokenVersion = payload.sessionVersion
    } catch {
      res.clearCookie(TOKEN_COOKIE, cookieOptions())
      return respond(res, { user: null })
    }
    const [current] = await sql`SELECT session_version, active FROM users WHERE id = ${subject}`
    if (!current?.active || (tokenVersion !== undefined && tokenVersion !== current.session_version) ||
      (tokenVersion === undefined && current.session_version !== 0)) {
      res.clearCookie(TOKEN_COOKIE, cookieOptions())
      return respond(res, { user: null })
    }
    const [user] = await sql`SELECT id, email, full_name, weekly_goal_workouts, weekly_goal_minutes, role FROM users WHERE id = ${subject} AND active`
    respond(res, { user: user ? publicUser(user) : null })
  }))

  app.get('/stats', asyncRoute(async (_req, res) => {
    const [stats] = await sql`
      SELECT
        (SELECT count(*)::int FROM users) AS members,
        (SELECT count(*)::int FROM workouts WHERE status = 'completed') AS completed_workouts,
        (SELECT count(*)::int FROM classes WHERE status = 'active' AND start_time >= date_trunc('week', now()) AND start_time < date_trunc('week', now()) + interval '7 days') AS classes_this_week
    `
    respond(res, stats)
  }))

  app.get('/membership-plans', asyncRoute(async (_req, res) => {
    const rows = await sql`SELECT id, name, description, price, billing_period, features FROM membership_plans WHERE active ORDER BY price`
    respond(res, rows)
  }))

  app.get('/classes', asyncRoute(async (req, res) => {
    const rows = await sql`
      SELECT c.id, c.title, c.coach_name, c.start_time, c.duration_minutes, c.capacity,
             c.booked_count, c.intensity, c.description,
             c.capacity - c.booked_count AS spots_remaining
      FROM classes c
      WHERE c.status = 'active' AND c.start_time >= now()
        AND (${req.query.type || null}::text IS NULL OR c.title = ${req.query.type || null})
      ORDER BY c.start_time LIMIT 100
    `
    respond(res, rows)
  }))

  app.get('/exercises', requireAuth, asyncRoute(async (req, res) => {
    const group = typeof req.query.group === 'string' ? req.query.group : null
    const difficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty : null
    const equipment = typeof req.query.equipment === 'string' ? req.query.equipment : null
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : null
    if (group && !muscles.has(group)) return fail(res, 400, 'Invalid muscle group.')
    if (difficulty && !difficulties.has(difficulty)) return fail(res, 400, 'Invalid difficulty.')
    const rows = await sql`
      SELECT id, name, muscle_group, sets, reps, difficulty, rest_seconds, description, equipment, instructions
      FROM exercises
      WHERE active AND (${group}::text IS NULL OR muscle_group = ${group})
        AND (${difficulty}::text IS NULL OR difficulty = ${difficulty})
        AND (${equipment}::text IS NULL OR equipment = ${equipment})
        AND (${search}::text IS NULL OR name ILIKE '%' || ${search} || '%')
      ORDER BY muscle_group, name
    `
    respond(res, rows)
  }))

  app.use(requireAuth)

  app.get('/nutrition', asyncRoute(async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10)
    if (!validDate(date)) return fail(res, 400, 'Date must use YYYY-MM-DD.')
    await sql`INSERT INTO nutrition_targets(user_id) VALUES (${req.userId}) ON CONFLICT (user_id) DO NOTHING`
    const [targets] = await sql`
      SELECT calories, protein, carbohydrates, fat, water_ml
      FROM nutrition_targets WHERE user_id = ${req.userId}
    `
    const entries = await sql`
      SELECT id, entry_date::text AS entry_date, meal_type, name, servings, calories, protein,
        carbohydrates, fat, created_at
      FROM food_entries WHERE user_id = ${req.userId} AND entry_date = ${date}::date
      ORDER BY created_at
    `
    const [water] = await sql`
      SELECT coalesce(sum(amount_ml), 0)::int AS amount_ml
      FROM water_logs WHERE user_id = ${req.userId} AND entry_date = ${date}::date
    `
    respond(res, { date, targets, entries, waterMl: water.amount_ml })
  }))

  app.get('/food-items', asyncRoute(async (_req, res) => {
    const items = await sql`SELECT id, name, calories, protein, carbohydrates, fat, serving_description, illustrative FROM food_items ORDER BY name`
    respond(res, items)
  }))

  app.put('/nutrition/targets', csrfGuard, asyncRoute(async (req, res) => {
    const { calories, protein, carbohydrates, fat, waterMl } = req.body || {}
    if (![calories, protein, carbohydrates, fat, waterMl].every((n) => Number.isFinite(Number(n))) ||
      Number(calories) < 1 || Number(calories) > 10000 ||
      [protein, carbohydrates, fat].some((n) => Number(n) < 1 || Number(n) > 1000) ||
      Number(waterMl) < 1 || Number(waterMl) > 20000) {
      return fail(res, 400, 'Nutrition targets are outside the allowed range.')
    }
    const [targets] = await sql`
      INSERT INTO nutrition_targets(user_id, calories, protein, carbohydrates, fat, water_ml, updated_at)
      VALUES (${req.userId}, ${Number(calories)}, ${Number(protein)}, ${Number(carbohydrates)},
        ${Number(fat)}, ${Number(waterMl)}, now())
      ON CONFLICT (user_id) DO UPDATE SET calories = EXCLUDED.calories, protein = EXCLUDED.protein,
        carbohydrates = EXCLUDED.carbohydrates, fat = EXCLUDED.fat, water_ml = EXCLUDED.water_ml,
        updated_at = now()
      RETURNING calories, protein, carbohydrates, fat, water_ml
    `
    respond(res, targets)
  }))

  app.post('/nutrition/entries', csrfGuard, asyncRoute(async (req, res) => {
    const { date, mealType, name, servings = 1, calories, protein = 0, carbohydrates = 0, fat = 0 } = req.body || {}
    const amounts = [servings, calories, protein, carbohydrates, fat].map(Number)
    if (!validDate(date) || !['Breakfast', 'Lunch', 'Dinner', 'Snacks'].includes(mealType) ||
      typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100 ||
      !amounts.every(Number.isFinite) || amounts[0] <= 0 || amounts[0] > 100 ||
      amounts[1] < 0 || amounts[1] > 10000 || amounts.slice(2).some((n) => n < 0 || n > 1000)) {
      return fail(res, 400, 'Food entry values are invalid.')
    }
    const [entry] = await sql`
      INSERT INTO food_entries(user_id, entry_date, meal_type, name, servings, calories, protein, carbohydrates, fat)
      VALUES (${req.userId}, ${date}::date, ${mealType}, ${name.trim()}, ${amounts[0]}, ${amounts[1]},
        ${amounts[2]}, ${amounts[3]}, ${amounts[4]})
      RETURNING id, entry_date::text AS entry_date, meal_type, name, servings, calories, protein, carbohydrates, fat
    `
    respond(res, entry, 201)
  }))

  app.put('/nutrition/entries/:id', csrfGuard, asyncRoute(async (req, res) => {
    const { mealType, name, servings, calories, protein, carbohydrates, fat } = req.body || {}
    const amounts = [servings, calories, protein, carbohydrates, fat].map(Number)
    if (!['Breakfast', 'Lunch', 'Dinner', 'Snacks'].includes(mealType) ||
      typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100 ||
      !amounts.every(Number.isFinite) || amounts[0] <= 0 || amounts[0] > 100 ||
      amounts[1] < 0 || amounts[1] > 10000 || amounts.slice(2).some((n) => n < 0 || n > 1000)) {
      return fail(res, 400, 'Food entry values are invalid.')
    }
    const [entry] = await sql`
      UPDATE food_entries SET meal_type = ${mealType}, name = ${name.trim()}, servings = ${amounts[0]},
        calories = ${amounts[1]}, protein = ${amounts[2]}, carbohydrates = ${amounts[3]},
        fat = ${amounts[4]}, updated_at = now()
      WHERE id = ${req.params.id} AND user_id = ${req.userId}
      RETURNING id, entry_date::text AS entry_date, meal_type, name, servings, calories, protein, carbohydrates, fat
    `
    if (!entry) return fail(res, 404, 'Food entry was not found.')
    respond(res, entry)
  }))

  app.delete('/nutrition/entries/:id', csrfGuard, asyncRoute(async (req, res) => {
    const [entry] = await sql`DELETE FROM food_entries WHERE id = ${req.params.id} AND user_id = ${req.userId} RETURNING id`
    if (!entry) return fail(res, 404, 'Food entry was not found.')
    respond(res, { deleted: true })
  }))

  app.post('/nutrition/water', csrfGuard, asyncRoute(async (req, res) => {
    const date = req.body?.date
    const amount = Number(req.body?.amountMl)
    if (!validDate(date) || !Number.isInteger(amount) || amount < 1 || amount > 5000) return fail(res, 400, 'Water amount must be between 1 and 5000 ml.')
    await sql`INSERT INTO water_logs(user_id, entry_date, amount_ml) VALUES (${req.userId}, ${date}::date, ${amount})`
    respond(res, { logged: true }, 201)
  }))

  app.delete('/nutrition/water', csrfGuard, asyncRoute(async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : ''
    if (!validDate(date)) return fail(res, 400, 'Date must use YYYY-MM-DD.')
    const [removed] = await sql`
      DELETE FROM water_logs WHERE ctid = (
        SELECT ctid FROM water_logs WHERE user_id = ${req.userId} AND entry_date = ${date}::date
        ORDER BY created_at DESC LIMIT 1
      ) AND user_id = ${req.userId} RETURNING amount_ml
    `
    respond(res, { removedMl: removed?.amount_ml || 0 })
  }))

  app.get('/nutrition/history', asyncRoute(async (req, res) => {
    const days = Number.parseInt(req.query.days, 10) || 7
    if (![7, 30, 90].includes(days)) return fail(res, 400, 'Choose a 7, 30, or 90 day history window.')
    const rows = await sql`
      SELECT d.day::date::text AS date, coalesce(sum(f.calories * f.servings), 0)::numeric AS calories,
        coalesce(sum(f.protein * f.servings), 0)::numeric AS protein,
        coalesce(sum(f.carbohydrates * f.servings), 0)::numeric AS carbohydrates,
        coalesce(sum(f.fat * f.servings), 0)::numeric AS fat, coalesce(w.amount_ml, 0)::int AS water_ml
      FROM generate_series(CURRENT_DATE - (${days}::int - 1), CURRENT_DATE, interval '1 day') d(day)
      LEFT JOIN food_entries f ON f.user_id = ${req.userId} AND f.entry_date = d.day::date
      LEFT JOIN LATERAL (
        SELECT sum(amount_ml)::int AS amount_ml FROM water_logs
        WHERE user_id = ${req.userId} AND entry_date = d.day::date
      ) w ON true
      GROUP BY d.day, w.amount_ml ORDER BY d.day
    `
    respond(res, rows)
  }))

  app.get('/analytics', asyncRoute(async (req, res) => {
    const days = Number.parseInt(req.query.days, 10) || 30
    if (![7, 30, 90].includes(days)) return fail(res, 400, 'Choose a 7, 30, or 90 day analytics window.')
    const workouts = await sql`
      SELECT workout_date::text AS date, count(*)::int AS workouts,
        coalesce(sum(duration_minutes), 0)::int AS minutes
      FROM workouts WHERE user_id = ${req.userId} AND status = 'completed'
        AND workout_date >= CURRENT_DATE - (${days}::int - 1)
      GROUP BY workout_date ORDER BY workout_date
    `
    const [totals] = await sql`
      SELECT count(*)::int AS workouts, coalesce(sum(duration_minutes), 0)::int AS minutes,
        coalesce(round(avg(duration_minutes)), 0)::int AS average_minutes
      FROM workouts WHERE user_id = ${req.userId} AND status = 'completed'
        AND workout_date >= CURRENT_DATE - (${days}::int - 1)
    `
    const volume = await sql`
      SELECT w.workout_date::text AS date, coalesce(sum(ws.weight_kg * ws.reps), 0)::numeric AS volume
      FROM workouts w JOIN workout_exercises we ON we.workout_id = w.id
      JOIN workout_sets ws ON ws.workout_exercise_id = we.id
      WHERE w.user_id = ${req.userId} AND w.status = 'completed' AND ws.completed
        AND w.workout_date >= CURRENT_DATE - (${days}::int - 1)
      GROUP BY w.workout_date ORDER BY w.workout_date
    `
    const groups = await sql`
      SELECT e.muscle_group AS name, count(*)::int AS sets
      FROM workouts w JOIN workout_exercises we ON we.workout_id = w.id
      JOIN exercises e ON e.id = we.exercise_id
      JOIN workout_sets ws ON ws.workout_exercise_id = we.id
      WHERE w.user_id = ${req.userId} AND w.status = 'completed' AND ws.completed
        AND w.workout_date >= CURRENT_DATE - (${days}::int - 1)
      GROUP BY e.muscle_group ORDER BY sets DESC
    `
    respond(res, { days, totals, workouts, volume, muscleGroups: groups })
  }))

  app.get('/achievements', asyncRoute(async (req, res) => {
    await updateAchievements(req.userId)
    const progress = await sql`
      WITH measures AS (
        SELECT 'workouts'::text AS criterion, count(*)::int AS value
          FROM workouts WHERE user_id = ${req.userId} AND status = 'completed'
        UNION ALL SELECT 'minutes', coalesce(sum(duration_minutes), 0)::int
          FROM workouts WHERE user_id = ${req.userId} AND status = 'completed'
        UNION ALL SELECT 'bookings', count(*)::int
          FROM class_bookings WHERE user_id = ${req.userId} AND booking_status IN ('booked', 'cancelled')
        UNION ALL SELECT 'records', count(DISTINCT (exercise_id, record_type))::int
          FROM personal_records WHERE user_id = ${req.userId}
      )
      SELECT a.id, a.title, a.description, a.criterion, a.threshold,
        coalesce(m.value, 0)::int AS progress, u.unlocked_at
      FROM achievement_catalog a
      LEFT JOIN measures m USING (criterion)
      LEFT JOIN user_achievements u ON u.achievement_id = a.id AND u.user_id = ${req.userId}
      ORDER BY a.threshold, a.title
    `
    respond(res, progress)
  }))

  app.get('/settings', asyncRoute(async (req, res) => {
    await sql`INSERT INTO user_settings(user_id) VALUES (${req.userId}) ON CONFLICT (user_id) DO NOTHING`
    const [settings] = await sql`
      SELECT u.email, u.full_name, u.created_at, u.weekly_goal_workouts, u.weekly_goal_minutes, s.preferences
      FROM users u JOIN user_settings s ON s.user_id = u.id WHERE u.id = ${req.userId}
    `
    respond(res, settings)
  }))

  app.put('/settings', csrfGuard, asyncRoute(async (req, res) => {
    const { preferences, weeklyGoalWorkouts, weeklyGoalMinutes } = req.body || {}
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences) ||
      !Number.isInteger(Number(weeklyGoalWorkouts)) || Number(weeklyGoalWorkouts) < 1 || Number(weeklyGoalWorkouts) > 7 ||
      !Number.isInteger(Number(weeklyGoalMinutes)) || Number(weeklyGoalMinutes) < 1 || Number(weeklyGoalMinutes) > 2000 ||
      !['dark', 'light'].includes(preferences.theme) || typeof preferences.reducedMotion !== 'boolean' ||
      typeof preferences.notifications !== 'boolean' || !Number.isInteger(preferences.restTimerSeconds) ||
      preferences.restTimerSeconds < 0 || preferences.restTimerSeconds > 900 ||
      !['metric', 'imperial'].includes(preferences.units)) return fail(res, 400, 'Settings values are invalid.')
    const [updated] = await sql`
      WITH member AS (
        UPDATE users SET weekly_goal_workouts = ${Number(weeklyGoalWorkouts)},
          weekly_goal_minutes = ${Number(weeklyGoalMinutes)}, updated_at = now()
        WHERE id = ${req.userId} RETURNING id
      )
      INSERT INTO user_settings(user_id, preferences, updated_at)
      SELECT id, ${JSON.stringify(preferences)}::jsonb, now() FROM member
      ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = now()
      RETURNING preferences
    `
    respond(res, { preferences: updated.preferences, weeklyGoalWorkouts: Number(weeklyGoalWorkouts), weeklyGoalMinutes: Number(weeklyGoalMinutes) })
  }))

  app.get('/admin/summary', requireAdmin, asyncRoute(async (_req, res) => {
    const [summary] = await sql`
      SELECT (SELECT count(*)::int FROM users) AS members,
        (SELECT count(*)::int FROM user_memberships WHERE status = 'active') AS active_memberships,
        (SELECT count(*)::int FROM workouts WHERE status = 'completed') AS completed_workouts,
        (SELECT count(*)::int FROM classes WHERE status = 'active' AND start_time > now()) AS upcoming_classes,
        (SELECT count(*)::int FROM class_bookings WHERE booking_status = 'booked') AS active_bookings,
        (SELECT count(*)::int FROM user_memberships WHERE status = 'pending') AS pending_inquiries
    `
    respond(res, summary)
  }))

  app.get('/admin/members', requireAdmin, asyncRoute(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : null
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 50))
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0)
    const members = await sql`
      SELECT id, email, full_name, role, active, created_at, weekly_goal_workouts, weekly_goal_minutes
      FROM users WHERE (${search}::text IS NULL OR email ILIKE '%' || ${search} || '%' OR full_name ILIKE '%' || ${search} || '%')
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `
    respond(res, members)
  }))

  app.use('/admin', requireAdmin)

  app.get('/admin/audit', asyncRoute(async (req, res) => {
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 50))
    const rows = await sql`
      SELECT id, actor_user_id, action, record_type, record_id, metadata, created_at
      FROM audit_logs ORDER BY created_at DESC LIMIT ${limit}
    `
    respond(res, rows)
  }))

  app.get('/admin/classes', asyncRoute(async (_req, res) => {
    const rows = await sql`
      SELECT id, title, coach_name, start_time, duration_minutes, capacity, booked_count,
        intensity, description, status
      FROM classes ORDER BY start_time DESC LIMIT 100
    `
    respond(res, rows)
  }))

  app.get('/admin/classes/:id/bookings', asyncRoute(async (req, res) => {
    const rows = await sql`
      SELECT b.id AS booking_id, b.booking_status, b.attendance_status, b.booked_at, b.cancelled_at,
        u.id AS member_id, u.full_name, u.email
      FROM class_bookings b JOIN users u ON u.id = b.user_id
      WHERE b.class_id = ${req.params.id} ORDER BY b.booked_at
    `
    respond(res, rows)
  }))

  app.get('/admin/exercises', asyncRoute(async (_req, res) => {
    const rows = await sql`
      SELECT id, name, muscle_group, sets, reps, difficulty, rest_seconds, description,
        equipment, instructions, active
      FROM exercises ORDER BY active DESC, muscle_group, name
    `
    respond(res, rows)
  }))

  app.patch('/admin/members/:id/active', csrfGuard, asyncRoute(async (req, res) => {
    const active = req.body?.active
    if (typeof active !== 'boolean') return fail(res, 400, 'Active status must be true or false.')
    if (req.params.id === req.userId) return fail(res, 400, 'Administrators cannot deactivate their own account here.')
    const [member] = await sql`
      UPDATE users SET active = ${active},
        session_version = CASE WHEN ${active} THEN session_version ELSE session_version + 1 END,
        updated_at = now()
      WHERE id = ${req.params.id} AND role <> 'admin'
      RETURNING id, email, full_name, active
    `
    if (!member) return fail(res, 404, 'Member was not found or cannot be changed.')
    await writeAudit(req.userId, active ? 'member.activated' : 'member.deactivated', 'user', member.id, { active })
    respond(res, member)
  }))

  app.post('/admin/exercises', csrfGuard, asyncRoute(async (req, res) => {
    const { id, name, muscleGroup, sets, reps, difficulty, restSeconds = 60, description, equipment, instructions = [] } = req.body || {}
    if (typeof id !== 'string' || !/^[a-z0-9-]{2,50}$/.test(id) || typeof name !== 'string' || !name.trim() || name.length > 100 ||
      !muscles.has(muscleGroup) || !Number.isInteger(sets) || sets < 1 || sets > 20 ||
      typeof reps !== 'string' || !reps.trim() || reps.length > 30 || !difficulties.has(difficulty) ||
      !Number.isInteger(restSeconds) || restSeconds < 0 || restSeconds > 900 ||
      typeof description !== 'string' || description.length > 500 || typeof equipment !== 'string' || equipment.length > 100 ||
      !Array.isArray(instructions) || instructions.length > 20 || instructions.some((value) => typeof value !== 'string' || value.length > 300)) {
      return fail(res, 400, 'Exercise details are invalid.')
    }
    const [exercise] = await sql`
      INSERT INTO exercises(id, name, muscle_group, sets, reps, difficulty, rest_seconds, description, equipment, instructions, active)
      VALUES (${id}, ${name.trim()}, ${muscleGroup}, ${sets}, ${reps.trim()}, ${difficulty}, ${restSeconds},
        ${description.trim()}, ${equipment.trim()}, ${instructions}, true)
      RETURNING id, name, muscle_group, sets, reps, difficulty, rest_seconds, description, equipment, active
    `
    await writeAudit(req.userId, 'exercise.created', 'exercise', exercise.id)
    respond(res, exercise, 201)
  }))

  app.patch('/admin/exercises/:id', csrfGuard, asyncRoute(async (req, res) => {
    const { name, muscleGroup, sets, reps, difficulty, restSeconds, description, equipment, instructions, active } = req.body || {}
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || !muscles.has(muscleGroup) ||
      !Number.isInteger(sets) || sets < 1 || sets > 20 || typeof reps !== 'string' || !reps.trim() || reps.length > 30 ||
      !difficulties.has(difficulty) || !Number.isInteger(restSeconds) || restSeconds < 0 || restSeconds > 900 ||
      typeof description !== 'string' || description.length > 500 || typeof equipment !== 'string' || equipment.length > 100 ||
      !Array.isArray(instructions) || instructions.length > 20 || instructions.some((value) => typeof value !== 'string' || value.length > 300) ||
      typeof active !== 'boolean') return fail(res, 400, 'Exercise details are invalid.')
    const [exercise] = await sql`
      UPDATE exercises SET name = ${name.trim()}, muscle_group = ${muscleGroup}, sets = ${sets},
        reps = ${reps.trim()}, difficulty = ${difficulty}, rest_seconds = ${restSeconds},
        description = ${description.trim()}, equipment = ${equipment.trim()}, instructions = ${instructions}, active = ${active}
      WHERE id = ${req.params.id}
      RETURNING id, name, muscle_group, sets, reps, difficulty, rest_seconds, description, equipment, active
    `
    if (!exercise) return fail(res, 404, 'Exercise was not found.')
    await writeAudit(req.userId, active ? 'exercise.updated' : 'exercise.deactivated', 'exercise', exercise.id, { active })
    respond(res, exercise)
  }))

  app.post('/admin/classes', csrfGuard, asyncRoute(async (req, res) => {
    const { title, coachName, startTime, durationMinutes, capacity, intensity, description } = req.body || {}
    const start = typeof startTime === 'string' ? new Date(startTime) : null
    if (typeof title !== 'string' || !title.trim() || title.length > 100 || typeof coachName !== 'string' || !coachName.trim() || coachName.length > 100 ||
      !start || Number.isNaN(start.getTime()) || start <= new Date() || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300 ||
      !Number.isInteger(capacity) || capacity < 1 || capacity > 500 || !['Easy', 'Medium', 'Hard'].includes(intensity) ||
      typeof description !== 'string' || description.length > 1000) return fail(res, 400, 'Class details are invalid.')
    const [item] = await sql`
      INSERT INTO classes(title, coach_name, start_time, duration_minutes, capacity, intensity, description)
      VALUES (${title.trim()}, ${coachName.trim()}, ${start.toISOString()}, ${durationMinutes}, ${capacity}, ${intensity}, ${description.trim()})
      RETURNING id, title, coach_name, start_time, duration_minutes, capacity, intensity, description, status
    `
    await writeAudit(req.userId, 'class.created', 'class', item.id)
    respond(res, item, 201)
  }))

  app.patch('/admin/classes/:id', csrfGuard, asyncRoute(async (req, res) => {
    const { title, coachName, startTime, durationMinutes, capacity, intensity, description, status } = req.body || {}
    const start = typeof startTime === 'string' ? new Date(startTime) : null
    if (typeof title !== 'string' || !title.trim() || title.length > 100 || typeof coachName !== 'string' || !coachName.trim() || coachName.length > 100 ||
      !start || Number.isNaN(start.getTime()) || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300 ||
      !Number.isInteger(capacity) || capacity < 1 || capacity > 500 || !['Easy', 'Medium', 'Hard'].includes(intensity) ||
      typeof description !== 'string' || description.length > 1000 || !['active', 'cancelled'].includes(status)) return fail(res, 400, 'Class details are invalid.')
    const [item] = await sql`
      WITH prior AS (
        SELECT id, status FROM classes WHERE id = ${req.params.id} AND booked_count <= ${capacity} FOR UPDATE
      ), updated AS (
        UPDATE classes c SET title = ${title.trim()}, coach_name = ${coachName.trim()}, start_time = ${start.toISOString()},
          duration_minutes = ${durationMinutes}, capacity = ${capacity}, intensity = ${intensity},
          description = ${description.trim()}, status = ${status},
          booked_count = CASE WHEN ${status} = 'cancelled' THEN 0 ELSE c.booked_count END
        FROM prior WHERE c.id = prior.id
        RETURNING c.id, c.title, c.coach_name, c.start_time, c.duration_minutes, c.capacity, c.intensity, c.description, c.status
      ), cancelled AS (
        UPDATE class_bookings b SET booking_status = 'cancelled', cancelled_at = now()
        FROM prior, updated
        WHERE ${status} = 'cancelled' AND prior.status <> 'cancelled'
          AND b.class_id = prior.id AND b.booking_status = 'booked'
        RETURNING b.user_id, b.class_id
      ), notices AS (
        INSERT INTO notifications(user_id, title, message)
        SELECT user_id, 'Class cancelled', 'A gym class you booked has been cancelled.'
        FROM cancelled RETURNING id
      )
      SELECT * FROM updated
    `
    if (!item) return fail(res, 409, 'Class was not found or capacity is below current bookings.')
    await writeAudit(req.userId, status === 'cancelled' ? 'class.cancelled' : 'class.updated', 'class', item.id, { status, capacity })
    respond(res, item)
  }))

  app.patch('/admin/classes/:id/attendance', csrfGuard, asyncRoute(async (req, res) => {
    const { bookingId, status } = req.body || {}
    if (typeof bookingId !== 'string' || !['attended', 'no_show', 'unknown'].includes(status)) return fail(res, 400, 'Attendance details are invalid.')
    const [booking] = await sql`
      UPDATE class_bookings SET attendance_status = ${status}
      WHERE id = ${bookingId} AND class_id = ${req.params.id} AND booking_status = 'booked'
      RETURNING id, class_id, attendance_status
    `
    if (!booking) return fail(res, 404, 'Active class booking was not found.')
    await writeAudit(req.userId, 'class.attendance_recorded', 'class_booking', booking.id, { attendanceStatus: status })
    respond(res, booking)
  }))

  app.get('/admin/memberships', asyncRoute(async (_req, res) => {
    const rows = await sql`
      SELECT m.id, m.user_id, u.full_name, u.email, m.plan_id, p.name AS plan_name,
        m.status, m.start_date, m.end_date
      FROM user_memberships m JOIN users u ON u.id = m.user_id JOIN membership_plans p ON p.id = m.plan_id
      ORDER BY m.id DESC LIMIT 100
    `
    respond(res, rows)
  }))

  app.patch('/admin/memberships/:id', csrfGuard, asyncRoute(async (req, res) => {
    const status = req.body?.status
    if (!['pending', 'active', 'cancelled', 'expired'].includes(status)) return fail(res, 400, 'Membership status is invalid.')
    const [membership] = await sql`
      UPDATE user_memberships SET status = ${status},
        start_date = CASE WHEN ${status} = 'active' THEN coalesce(start_date, CURRENT_DATE) ELSE start_date END
      WHERE id = ${req.params.id} AND status <> ${status}
      RETURNING id, user_id, status, plan_id
    `
    if (!membership) {
      const [existing] = await sql`SELECT id, user_id, status, plan_id FROM user_memberships WHERE id = ${req.params.id}`
      if (!existing) return fail(res, 404, 'Membership inquiry was not found.')
      return respond(res, existing)
    }
    await sql`INSERT INTO notifications(user_id, title, message) VALUES (${membership.user_id}, 'Membership status updated', ${'Your membership inquiry status is now ' || status || '.'})`
    await writeAudit(req.userId, 'membership.status_updated', 'membership', membership.id, { status, planId: membership.plan_id })
    respond(res, membership)
  }))

  app.get('/dashboard', asyncRoute(async (req, res) => {
    const [user] = await sql`SELECT full_name, weekly_goal_workouts, weekly_goal_minutes FROM users WHERE id = ${req.userId}`
    const [summary] = await sql`
      SELECT count(*) FILTER (WHERE workout_date >= date_trunc('week', CURRENT_DATE)::date AND status = 'completed')::int AS workouts_this_week,
             coalesce(sum(duration_minutes) FILTER (WHERE workout_date >= CURRENT_DATE - 6 AND status = 'completed'), 0)::int AS active_minutes
      FROM workouts WHERE user_id = ${req.userId}
    `
    const workouts = await sql`
      SELECT w.id, w.name, w.workout_date::text AS workout_date, w.status, w.duration_minutes, count(we.id)::int AS exercise_count
      FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
      WHERE w.user_id = ${req.userId} AND w.workout_date = CURRENT_DATE
        AND w.status IN ('planned', 'in_progress')
      GROUP BY w.id ORDER BY w.created_at DESC LIMIT 1
    `
    const scheduledWorkouts = await sql`
      SELECT id, name, workout_date::text AS workout_date, status
      FROM workouts WHERE user_id = ${req.userId} AND status = 'planned'
        AND workout_date > CURRENT_DATE
      ORDER BY workout_date, created_at LIMIT 7
    `
    const recent = await sql`    SELECT id, name, workout_date::text AS workout_date, duration_minutes FROM workouts WHERE user_id = ${req.userId} AND status = 'completed' ORDER BY completed_at DESC LIMIT 5`
    const booked = await sql`
      SELECT c.id, c.title, c.coach_name, c.start_time, c.duration_minutes
      FROM class_bookings b JOIN classes c ON c.id = b.class_id
      WHERE b.user_id = ${req.userId} AND b.booking_status = 'booked' AND c.status = 'active' AND c.start_time > now()
      ORDER BY c.start_time LIMIT 5
    `
    const daily = await sql`
      SELECT to_char(d.day::date, 'YYYY-MM-DD') AS date, coalesce(sum(w.duration_minutes), 0)::int AS minutes,
             count(w.id)::int AS sessions
      FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, interval '1 day') d(day)
      LEFT JOIN workouts w ON w.user_id = ${req.userId} AND w.workout_date = d.day::date AND w.status = 'completed'
      GROUP BY d.day ORDER BY d.day
    `
    const [calendar] = await sql`SELECT CURRENT_DATE::text AS today`
    const streakDates = await sql`
      SELECT DISTINCT workout_date::text AS date
      FROM workouts WHERE user_id = ${req.userId} AND status = 'completed'
        AND workout_date >= CURRENT_DATE - 400
      ORDER BY date DESC
    `
    respond(res, { user, summary, today: calendar.today, streakDates: streakDates.map((item) => item.date), todayWorkout: workouts[0] || null, scheduledWorkouts, recentWorkouts: recent, upcomingClasses: booked, dailyActivity: daily })
  }))

  app.get('/profile', asyncRoute(async (req, res) => {
    const [profile] = await sql`
      SELECT u.id, u.email, u.full_name, u.weekly_goal_workouts, u.weekly_goal_minutes,
             p.fitness_goal, p.experience_level, p.preferred_training_days, p.profile_image_url
      FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ${req.userId}
    `
    respond(res, profile)
  }))

  app.get('/workout-templates', asyncRoute(async (req, res) => {
    const templates = await sql`
      SELECT t.id, t.name, t.goal, t.experience_level, t.training_days, t.created_at, t.updated_at,
        coalesce(json_agg(json_build_object(
          'id', te.id, 'exerciseId', e.id, 'name', e.name, 'muscleGroup', e.muscle_group,
          'orderIndex', te.order_index, 'sets', te.sets, 'reps', te.reps, 'restSeconds', te.rest_seconds
        ) ORDER BY te.order_index) FILTER (WHERE te.id IS NOT NULL), '[]'::json) AS exercises
      FROM workout_templates t LEFT JOIN workout_template_exercises te ON te.template_id = t.id
      LEFT JOIN exercises e ON e.id = te.exercise_id
      WHERE t.user_id = ${req.userId}
      GROUP BY t.id ORDER BY t.updated_at DESC
    `
    respond(res, templates)
  }))

  app.post('/workout-templates', csrfGuard, asyncRoute(async (req, res) => {
    const { name, goal = 'General Fitness', experienceLevel = 'Beginner', trainingDays = [], exercises = [] } = req.body || {}
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100 ||
      typeof goal !== 'string' || goal.trim().length > 100 || !difficulties.has(experienceLevel) ||
      !Array.isArray(trainingDays) || trainingDays.length > 7 || trainingDays.some((day) => !weekdays.includes(day)) ||
      !Array.isArray(exercises) || exercises.length > 30) return fail(res, 400, 'Workout template details are invalid.')
    const ids = exercises.map((exercise) => exercise?.exerciseId)
    if (ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) return fail(res, 400, 'Template exercises must be unique.')
    for (const exercise of exercises) {
      if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > 20 ||
        typeof exercise.reps !== 'string' || exercise.reps.trim().length < 1 || exercise.reps.length > 30 ||
        !Number.isInteger(exercise.restSeconds) || exercise.restSeconds < 0 || exercise.restSeconds > 900) {
        return fail(res, 400, 'Exercise sets, reps, or rest duration are invalid.')
      }
    }
    const known = ids.length ? await sql`SELECT id FROM exercises WHERE id = ANY(${ids}::text[])` : []
    if (known.length !== ids.length) return fail(res, 400, 'One or more selected exercises do not exist.')
    const templateId = await sql`
      WITH template AS (
        INSERT INTO workout_templates(user_id, name, goal, experience_level, training_days)
        VALUES (${req.userId}, ${name.trim()}, ${goal.trim() || 'General Fitness'}, ${experienceLevel}, ${trainingDays})
        RETURNING id
      ), items AS (
        INSERT INTO workout_template_exercises(template_id, exercise_id, order_index, sets, reps, rest_seconds)
        SELECT template.id, item.exercise_id, item.order_index, item.sets, item.reps, item.rest_seconds
        FROM template CROSS JOIN jsonb_to_recordset(${JSON.stringify(exercises.map((item, index) => ({
          exercise_id: item.exerciseId, order_index: index, sets: item.sets, reps: item.reps, rest_seconds: item.restSeconds,
        })))}::jsonb) AS item(exercise_id text, order_index int, sets int, reps text, rest_seconds int)
        RETURNING id
      )
      SELECT id FROM template
    `
    respond(res, { id: templateId[0].id, name: name.trim() }, 201)
  }))

  app.put('/workout-templates/:id', csrfGuard, asyncRoute(async (req, res) => {
    const { name, goal, experienceLevel, trainingDays } = req.body || {}
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100 ||
      typeof goal !== 'string' || goal.trim().length > 100 || !difficulties.has(experienceLevel) ||
      !Array.isArray(trainingDays) || trainingDays.length > 7 || trainingDays.some((day) => !weekdays.includes(day))) {
      return fail(res, 400, 'Workout template details are invalid.')
    }
    const [template] = await sql`
      UPDATE workout_templates SET name = ${name.trim()}, goal = ${goal.trim()},
        experience_level = ${experienceLevel}, training_days = ${trainingDays}, updated_at = now()
      WHERE id = ${req.params.id} AND user_id = ${req.userId} RETURNING id, name, goal, experience_level, training_days
    `
    if (!template) return fail(res, 404, 'Workout template was not found.')
    respond(res, template)
  }))

  app.post('/workout-templates/:id/exercises', csrfGuard, asyncRoute(async (req, res) => {
    const { exerciseId, sets, reps, restSeconds } = req.body || {}
    if (typeof exerciseId !== 'string' || !Number.isInteger(sets) || sets < 1 || sets > 20 ||
      typeof reps !== 'string' || reps.trim().length < 1 || reps.length > 30 ||
      !Number.isInteger(restSeconds) || restSeconds < 0 || restSeconds > 900) return fail(res, 400, 'Exercise settings are invalid.')
    const [item] = await sql`
      WITH owner AS (
        SELECT id FROM workout_templates WHERE id = ${req.params.id} AND user_id = ${req.userId}
      ), next_order AS (
        SELECT coalesce(max(te.order_index) + 1, 0) AS value FROM workout_template_exercises te
        JOIN owner ON owner.id = te.template_id
      )
      INSERT INTO workout_template_exercises(template_id, exercise_id, order_index, sets, reps, rest_seconds)
      SELECT owner.id, e.id, next_order.value, ${sets}, ${reps.trim()}, ${restSeconds}
      FROM owner CROSS JOIN next_order JOIN exercises e ON e.id = ${exerciseId}
      RETURNING id, template_id, exercise_id, order_index, sets, reps, rest_seconds
    `
    if (!item) return fail(res, 404, 'Template or exercise was not found.')
    await sql`UPDATE workout_templates SET updated_at = now() WHERE id = ${req.params.id} AND user_id = ${req.userId}`
    respond(res, item, 201)
  }))

  app.put('/workout-templates/:id/exercises/:rowId', csrfGuard, asyncRoute(async (req, res) => {
    const { sets, reps, restSeconds } = req.body || {}
    if (!Number.isInteger(sets) || sets < 1 || sets > 20 ||
      typeof reps !== 'string' || reps.trim().length < 1 || reps.length > 30 ||
      !Number.isInteger(restSeconds) || restSeconds < 0 || restSeconds > 900) return fail(res, 400, 'Exercise settings are invalid.')
    const [item] = await sql`
      UPDATE workout_template_exercises te SET sets = ${sets}, reps = ${reps.trim()},
        rest_seconds = ${restSeconds}
      FROM workout_templates t
      WHERE te.id = ${req.params.rowId} AND te.template_id = t.id
        AND t.id = ${req.params.id} AND t.user_id = ${req.userId}
      RETURNING te.id
    `
    if (!item) return fail(res, 404, 'Template exercise was not found.')
    await sql`UPDATE workout_templates SET updated_at = now() WHERE id = ${req.params.id} AND user_id = ${req.userId}`
    respond(res, { updated: true })
  }))

  app.patch('/workout-templates/:id/reorder', csrfGuard, asyncRoute(async (req, res) => {
    const ids = req.body?.exerciseRowIds
    if (!Array.isArray(ids) || ids.length > 30 || ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) {
      return fail(res, 400, 'Template exercise order is invalid.')
    }
    const owned = await sql`
      SELECT te.id::text AS id FROM workout_template_exercises te
      JOIN workout_templates t ON t.id = te.template_id
      WHERE t.id = ${req.params.id} AND t.user_id = ${req.userId}
    `
    const currentIds = owned.map((row) => row.id).sort()
    if (currentIds.length !== ids.length || currentIds.some((id, index) => id !== [...ids].sort()[index])) {
      return fail(res, 400, 'The order must contain each template exercise exactly once.')
    }
    await sql.transaction([
      sql`UPDATE workout_template_exercises te SET order_index = order_index + 1000
        FROM workout_templates t WHERE te.template_id = t.id
          AND t.id = ${req.params.id} AND t.user_id = ${req.userId}`,
      sql`UPDATE workout_template_exercises te SET order_index = ordered.ordinality - 1
        FROM unnest(${ids}::uuid[]) WITH ORDINALITY AS ordered(id, ordinality), workout_templates t
        WHERE te.template_id = t.id AND t.id = ${req.params.id} AND t.user_id = ${req.userId}
          AND te.id = ordered.id`,
    ])
    await sql`UPDATE workout_templates SET updated_at = now() WHERE id = ${req.params.id} AND user_id = ${req.userId}`
    respond(res, { reordered: true })
  }))

  app.delete('/workout-templates/:id/exercises/:rowId', csrfGuard, asyncRoute(async (req, res) => {
    const [item] = await sql`
      DELETE FROM workout_template_exercises te USING workout_templates t
      WHERE te.id = ${req.params.rowId} AND te.template_id = t.id
        AND t.id = ${req.params.id} AND t.user_id = ${req.userId} RETURNING te.id
    `
    if (!item) return fail(res, 404, 'Template exercise was not found.')
    await sql`UPDATE workout_templates SET updated_at = now() WHERE id = ${req.params.id} AND user_id = ${req.userId}`
    respond(res, { deleted: true })
  }))

  app.delete('/workout-templates/:id', csrfGuard, asyncRoute(async (req, res) => {
    const [template] = await sql`
      DELETE FROM workout_templates WHERE id = ${req.params.id} AND user_id = ${req.userId} RETURNING id
    `
    if (!template) return fail(res, 404, 'Workout template was not found.')
    respond(res, { deleted: true })
  }))

  app.post('/workout-templates/:id/schedule', csrfGuard, asyncRoute(async (req, res) => {
    const date = req.body?.date
    if (!validDate(date)) return fail(res, 400, 'Scheduled date must use YYYY-MM-DD.')
    const [valid] = await sql`SELECT ${date}::date >= CURRENT_DATE AS is_valid`
    if (!valid.is_valid) return fail(res, 400, 'A workout cannot be scheduled in the past.')
    const [scheduled] = await sql`
      WITH template AS (
        SELECT id, user_id, name FROM workout_templates
        WHERE id = ${req.params.id} AND user_id = ${req.userId}
      ), workout AS (
        INSERT INTO workouts(user_id, name, workout_date, template_id, status)
        SELECT user_id, name, ${date}::date, id, 'planned' FROM template
        RETURNING id, name, workout_date::text AS workout_date, status
      ), copied_exercises AS (
        INSERT INTO workout_exercises(workout_id, exercise_id, order_index)
        SELECT workout.id, te.exercise_id, te.order_index
        FROM workout CROSS JOIN template
        JOIN workout_template_exercises te ON te.template_id = template.id
        RETURNING id, exercise_id
      ), copied_sets AS (
        INSERT INTO workout_sets(workout_exercise_id, set_number)
        SELECT ce.id, series.n
        FROM copied_exercises ce JOIN template ON true
        JOIN workout_template_exercises te ON te.template_id = template.id AND te.exercise_id = ce.exercise_id
        CROSS JOIN LATERAL generate_series(1, te.sets) series(n)
        RETURNING id
      )
      SELECT workout.id, workout.name, workout.workout_date, workout.status FROM workout
    `
    if (!scheduled) return fail(res, 404, 'Workout template was not found.')
    respond(res, scheduled, 201)
  }))

  app.get('/memberships/me', asyncRoute(async (req, res) => {
    const [membership] = await sql`
      SELECT m.id, m.status, m.start_date, m.end_date, p.id AS plan_id, p.name AS plan_name,
             p.description, p.price, p.billing_period
      FROM user_memberships m JOIN membership_plans p ON p.id = m.plan_id
      WHERE m.user_id = ${req.userId} AND m.status IN ('pending', 'active')
      ORDER BY m.id DESC LIMIT 1
    `
    respond(res, membership || null)
  }))

  app.get('/memberships/history', asyncRoute(async (req, res) => {
    const rows = await sql`
      SELECT m.id, m.status, m.start_date, m.end_date, p.id AS plan_id, p.name AS plan_name,
        p.description, p.price, p.billing_period
      FROM user_memberships m JOIN membership_plans p ON p.id = m.plan_id
      WHERE m.user_id = ${req.userId} ORDER BY m.id DESC
    `
    respond(res, rows)
  }))

  app.get('/privacy/export', asyncRoute(async (req, res) => {
    const [member] = await sql`
      SELECT id, email, full_name, role, weekly_goal_workouts, weekly_goal_minutes, created_at
      FROM users WHERE id = ${req.userId}
    `
    const [profile] = await sql`SELECT fitness_goal, experience_level, preferred_training_days, updated_at FROM user_profiles WHERE user_id = ${req.userId}`
    const [settings] = await sql`SELECT preferences, updated_at FROM user_settings WHERE user_id = ${req.userId}`
    const [nutritionTargets] = await sql`SELECT calories, protein, carbohydrates, fat, water_ml FROM nutrition_targets WHERE user_id = ${req.userId}`
    const [templates, workouts, entries, water, bookings, memberships, records, notifications, unlocked] = await Promise.all([
      sql`SELECT t.id, t.name, t.goal, t.experience_level, t.training_days, coalesce(json_agg(json_build_object(
        'exerciseId', te.exercise_id, 'sets', te.sets, 'reps', te.reps, 'restSeconds', te.rest_seconds, 'orderIndex', te.order_index
      ) ORDER BY te.order_index) FILTER (WHERE te.id IS NOT NULL), '[]'::json) AS exercises
        FROM workout_templates t LEFT JOIN workout_template_exercises te ON te.template_id = t.id
        WHERE t.user_id = ${req.userId} GROUP BY t.id`,
      sql`SELECT w.id, w.name, w.workout_date::text AS workout_date, w.status, w.duration_minutes, w.started_at, w.completed_at,
        coalesce(json_agg(json_build_object('exerciseId', we.exercise_id, 'setNumber', ws.set_number,
          'completed', ws.completed, 'reps', ws.reps, 'weightKg', ws.weight_kg, 'durationSeconds', ws.duration_seconds))
          FILTER (WHERE ws.id IS NOT NULL), '[]'::json) AS sets
        FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
        LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
        WHERE w.user_id = ${req.userId} GROUP BY w.id ORDER BY w.workout_date DESC`,
      sql`SELECT id, entry_date::text AS date, meal_type, name, servings, calories, protein, carbohydrates, fat
        FROM food_entries WHERE user_id = ${req.userId} ORDER BY entry_date DESC, created_at`,
      sql`SELECT entry_date::text AS date, amount_ml, created_at FROM water_logs WHERE user_id = ${req.userId} ORDER BY entry_date DESC, created_at`,
      sql`SELECT b.id, b.booking_status, b.attendance_status, b.booked_at, b.cancelled_at,
        c.title, c.coach_name, c.start_time FROM class_bookings b JOIN classes c ON c.id = b.class_id
        WHERE b.user_id = ${req.userId} ORDER BY c.start_time DESC`,
      sql`SELECT m.id, m.status, m.start_date, m.end_date, p.name AS plan_name
        FROM user_memberships m JOIN membership_plans p ON p.id = m.plan_id WHERE m.user_id = ${req.userId}`,
      sql`SELECT p.exercise_id, e.name AS exercise_name, p.record_type, p.record_value, p.record_unit, p.achieved_at
        FROM personal_records p JOIN exercises e ON e.id = p.exercise_id WHERE p.user_id = ${req.userId} ORDER BY p.achieved_at DESC`,
      sql`SELECT title, message, is_read, created_at FROM notifications WHERE user_id = ${req.userId} ORDER BY created_at DESC`,
      sql`SELECT a.id, a.title, a.description, u.unlocked_at FROM user_achievements u
        JOIN achievement_catalog a ON a.id = u.achievement_id WHERE u.user_id = ${req.userId} ORDER BY u.unlocked_at DESC`,
    ])
    respond(res, {
      exportedAt: new Date().toISOString(), member, profile, settings: settings || null, nutritionTargets: nutritionTargets || null,
      workoutTemplates: templates, workouts, foodEntries: entries, waterLogs: water, classBookings: bookings,
      memberships, personalRecords: records, notifications, achievements: unlocked,
    })
  }))

  app.put('/account/email', csrfGuard, asyncRoute(async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = req.body?.currentPassword
    if (!emailPattern.test(email) || email.length > 254 || typeof password !== 'string' || password.length > 72) {
      return fail(res, 400, 'Enter a valid email address and current password.')
    }
    const [member] = await sql`SELECT password_hash FROM users WHERE id = ${req.userId} AND active`
    if (!member || !await bcrypt.compare(password, member.password_hash)) return fail(res, 401, 'Current password is incorrect.')
    const [updated] = await sql`UPDATE users SET email = ${email}, updated_at = now() WHERE id = ${req.userId} RETURNING email`
    respond(res, updated)
  }))

  app.put('/account/password', csrfGuard, asyncRoute(async (req, res) => {
    const currentPassword = req.body?.currentPassword
    const newPassword = req.body?.newPassword
    if (typeof currentPassword !== 'string' || currentPassword.length > 72 ||
      typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 72) {
      return fail(res, 400, 'New password must contain at least 8 characters.')
    }
    const [member] = await sql`
      SELECT id, email, full_name, weekly_goal_workouts, weekly_goal_minutes, role, password_hash, session_version
      FROM users WHERE id = ${req.userId} AND active
    `
    if (!member || !await bcrypt.compare(currentPassword, member.password_hash)) return fail(res, 401, 'Current password is incorrect.')
    if (await bcrypt.compare(newPassword, member.password_hash)) return fail(res, 400, 'Choose a password different from your current password.')
    const passwordHash = await bcrypt.hash(newPassword, 12)
    const [updated] = await sql`
      UPDATE users SET password_hash = ${passwordHash}, session_version = session_version + 1, updated_at = now()
      WHERE id = ${req.userId} AND active
      RETURNING id, email, full_name, weekly_goal_workouts, weekly_goal_minutes, role, session_version
    `
    await issueSession(res, updated)
    respond(res, { user: publicUser(updated) })
  }))

  app.post('/account/delete', csrfGuard, asyncRoute(async (req, res) => {
    const password = req.body?.currentPassword
    if (typeof password !== 'string' || password.length > 72) return fail(res, 400, 'Enter your current password to confirm account deletion.')
    const [member] = await sql`SELECT password_hash FROM users WHERE id = ${req.userId} AND active`
    if (!member || !await bcrypt.compare(password, member.password_hash)) return fail(res, 401, 'Current password is incorrect.')
    const [deleted] = await sql`DELETE FROM users WHERE id = ${req.userId} RETURNING id`
    if (!deleted) return fail(res, 404, 'Account was not found.')
    res.clearCookie(TOKEN_COOKIE, cookieOptions())
    respond(res, { deleted: true })
  }))

  app.post('/membership-inquiries', csrfGuard, asyncRoute(async (req, res) => {
    const planId = req.body?.planId
    if (typeof planId !== 'string' || planId.length > 50) return fail(res, 400, 'Choose a valid membership plan.')
    const [membership] = await sql`
      INSERT INTO user_memberships(user_id, plan_id, status)
      SELECT ${req.userId}, id, 'pending' FROM membership_plans WHERE id = ${planId} AND active
      RETURNING id, plan_id, status
    `
    if (!membership) return fail(res, 404, 'Membership plan was not found.')
    await sql`INSERT INTO notifications(user_id, title, message) VALUES (${req.userId}, 'Inquiry received', 'Your membership inquiry is pending review. No payment has been taken.')`
    respond(res, membership, 201)
  }))

  app.put('/profile', csrfGuard, asyncRoute(async (req, res) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : ''
    const workouts = Number(req.body?.weeklyGoalWorkouts)
    const minutes = Number(req.body?.weeklyGoalMinutes)
    const goal = typeof req.body?.fitnessGoal === 'string' ? req.body.fitnessGoal.trim() : 'General Fitness'
    const level = req.body?.experienceLevel
    const days = req.body?.preferredTrainingDays
    if (fullName.length < 2 || fullName.length > 100 || !Number.isInteger(workouts) || workouts < 1 || workouts > 7 ||
      !Number.isInteger(minutes) || minutes < 1 || minutes > 2000 || goal.length > 100 ||
      !difficulties.has(level) || !Array.isArray(days) || days.length > 7 ||
      days.some((day) => !['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(day))) {
      return fail(res, 400, 'Profile values are invalid.')
    }
    const [updated] = await sql`
      WITH u AS (
        UPDATE users SET full_name = ${fullName}, weekly_goal_workouts = ${workouts},
          weekly_goal_minutes = ${minutes}, updated_at = now()
        WHERE id = ${req.userId}
        RETURNING id, email, full_name, weekly_goal_workouts, weekly_goal_minutes
      )
      UPDATE user_profiles p SET fitness_goal = ${goal}, experience_level = ${level},
        preferred_training_days = ${days}, updated_at = now()
      FROM u WHERE p.user_id = u.id
      RETURNING u.id, u.email, u.full_name, u.weekly_goal_workouts, u.weekly_goal_minutes,
        p.fitness_goal, p.experience_level, p.preferred_training_days
    `
    respond(res, updated)
  }))

  app.get('/workouts', asyncRoute(async (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id : null
    const rows = await sql`
      SELECT w.id, w.name, w.workout_date::text AS workout_date, w.status, w.duration_minutes, w.started_at, w.completed_at,
             coalesce(json_agg(json_build_object(
               'id', we.id, 'exerciseId', e.id, 'name', e.name, 'muscleGroup', e.muscle_group,
               'sets', e.sets, 'reps', e.reps, 'restSeconds', e.rest_seconds,
               'orderIndex', we.order_index,
               'workoutSets', coalesce((SELECT json_agg(json_build_object(
                 'id', ws.id, 'setNumber', ws.set_number, 'completed', ws.completed,
                 'completedAt', ws.completed_at, 'reps', ws.reps, 'weightKg', ws.weight_kg
               ) ORDER BY ws.set_number) FROM workout_sets ws WHERE ws.workout_exercise_id = we.id), '[]'::json)
             ) ORDER BY we.order_index) FILTER (WHERE we.id IS NOT NULL), '[]'::json) AS exercises
      FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
      LEFT JOIN exercises e ON e.id = we.exercise_id
      WHERE w.user_id = ${req.userId} AND (${id}::uuid IS NULL OR w.id = ${id}::uuid)
      GROUP BY w.id ORDER BY w.workout_date DESC, w.created_at DESC LIMIT 50
    `
    respond(res, id ? rows[0] || null : rows)
  }))

  app.post('/workouts', csrfGuard, asyncRoute(async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 100) : 'Today’s workout'
    const [workout] = await sql`
      INSERT INTO workouts(user_id, name) VALUES (${req.userId}, ${name})
      RETURNING id, name, workout_date::text AS workout_date, status, created_at
    `
    respond(res, workout, 201)
  }))

  app.delete('/workouts/:id', csrfGuard, asyncRoute(async (req, res) => {
    const [workout] = await sql`
      DELETE FROM workouts WHERE id = ${req.params.id} AND user_id = ${req.userId} AND status = 'planned'
      RETURNING id
    `
    if (!workout) return fail(res, 409, 'Only your planned workouts can be deleted. In-progress and completed history is protected.')
    respond(res, { deleted: true })
  }))

  app.post('/workouts/:id/exercises', csrfGuard, asyncRoute(async (req, res) => {
    const exerciseId = req.body?.exerciseId
    if (typeof exerciseId !== 'string') return fail(res, 400, 'An exercise is required.')
    const inserted = await sql`
      WITH owned AS (
        SELECT w.id AS workout_id, coalesce(max(we.order_index) + 1, 0) AS next_order
        FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
        WHERE w.id = ${req.params.id} AND w.user_id = ${req.userId} AND w.status = 'planned'
        GROUP BY w.id
      ), new_exercise AS (
        INSERT INTO workout_exercises(workout_id, exercise_id, order_index)
        SELECT owned.workout_id, e.id, owned.next_order
        FROM owned CROSS JOIN exercises e WHERE e.id = ${exerciseId}
        RETURNING id, workout_id, exercise_id
      )
      INSERT INTO workout_sets(workout_exercise_id, set_number)
      SELECT ne.id, series.n FROM new_exercise ne
      JOIN exercises e ON e.id = ne.exercise_id
      CROSS JOIN LATERAL generate_series(1, e.sets) series(n)
      RETURNING id
    `
    if (!inserted.length) return fail(res, 404, 'Planned workout or exercise was not found.')
    respond(res, { added: true }, 201)
  }))

  app.delete('/workouts/:id/exercises/:exerciseId', csrfGuard, asyncRoute(async (req, res) => {
    const deleted = await sql`
      DELETE FROM workout_exercises we USING workouts w
      WHERE we.workout_id = w.id AND w.id = ${req.params.id} AND w.user_id = ${req.userId}
        AND w.status = 'planned' AND we.exercise_id = ${req.params.exerciseId}
      RETURNING we.id
    `
    if (!deleted.length) return fail(res, 404, 'Planned workout exercise was not found.')
    respond(res, { removed: true })
  }))

  app.patch('/workouts/:id/reorder', csrfGuard, asyncRoute(async (req, res) => {
    const ids = req.body?.exerciseIds
    if (!Array.isArray(ids) || ids.length > 30 || ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) {
      return fail(res, 400, 'Exercise order is invalid.')
    }
    const owned = await sql`
      SELECT we.exercise_id FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
      WHERE w.id = ${req.params.id} AND w.user_id = ${req.userId} AND w.status = 'planned'
    `
    const currentIds = owned.map((row) => row.exercise_id).sort()
    if (currentIds.length !== ids.length || currentIds.some((id, index) => id !== [...ids].sort()[index])) {
      return fail(res, 400, 'Exercise order must include every workout exercise exactly once.')
    }
    await sql.transaction([
      sql`UPDATE workout_exercises we SET order_index = order_index + 1000
        FROM workouts w WHERE we.workout_id = w.id AND w.id = ${req.params.id}
          AND w.user_id = ${req.userId} AND w.status = 'planned'`,
      sql`UPDATE workout_exercises we SET order_index = ordered.ordinality - 1
        FROM unnest(${ids}::text[]) WITH ORDINALITY AS ordered(exercise_id, ordinality), workouts w
        WHERE we.workout_id = w.id AND w.id = ${req.params.id} AND w.user_id = ${req.userId}
          AND w.status = 'planned' AND we.exercise_id = ordered.exercise_id`,
    ])
    respond(res, { reordered: true })
  }))

  app.post('/workouts/:id/start', csrfGuard, asyncRoute(async (req, res) => {
    const [workout] = await sql`
      UPDATE workouts SET status = 'in_progress', started_at = coalesce(started_at, now())
      WHERE id = ${req.params.id} AND user_id = ${req.userId} AND status IN ('planned', 'in_progress')
      RETURNING id, name, status, started_at
    `
    if (!workout) return fail(res, 404, 'Workout was not found or is already complete.')
    respond(res, workout)
  }))

  app.patch('/sets/:id', csrfGuard, asyncRoute(async (req, res) => {
    const completed = req.body?.completed
    const reps = req.body?.reps
    const weight = req.body?.weightKg
    if (typeof completed !== 'boolean' || (reps !== undefined && (!Number.isInteger(reps) || reps < 0 || reps > 1000)) ||
      (weight !== undefined && (typeof weight !== 'number' || weight < 0 || weight > 10000))) {
      return fail(res, 400, 'Set performance values are invalid.')
    }
    const [set] = await sql`
      UPDATE workout_sets ws
      SET completed = ${completed},
          completed_at = CASE WHEN ${completed} THEN coalesce(ws.completed_at, now()) ELSE NULL END,
          reps = coalesce(${reps ?? null}, ws.reps), weight_kg = coalesce(${weight ?? null}, ws.weight_kg)
      FROM workout_exercises we, workouts w
      WHERE ws.id = ${req.params.id} AND ws.workout_exercise_id = we.id
        AND we.workout_id = w.id AND w.user_id = ${req.userId} AND w.status = 'in_progress'
      RETURNING ws.id, ws.set_number, ws.completed, ws.completed_at, ws.reps, ws.weight_kg
    `
    if (!set) return fail(res, 404, 'Workout set was not found.')
    if (set.completed && (Number(set.weight_kg) > 0 || Number(set.reps) > 0)) {
      await sql`
        WITH context AS (
          SELECT w.user_id, e.id AS exercise_id, e.name AS exercise_name,
                 ws.weight_kg, ws.reps
          FROM workout_sets ws
          JOIN workout_exercises we ON we.id = ws.workout_exercise_id
          JOIN workouts w ON w.id = we.workout_id
          JOIN exercises e ON e.id = we.exercise_id
          WHERE ws.id = ${set.id} AND w.user_id = ${req.userId}
        ), candidates AS (
          SELECT c.user_id, c.exercise_id, c.exercise_name, 'weight'::text AS record_type,
                 c.weight_kg::numeric AS record_value, 'kg'::text AS record_unit
          FROM context c WHERE c.weight_kg > 0
          UNION ALL
          SELECT c.user_id, c.exercise_id, c.exercise_name, 'repetitions', c.reps::numeric, 'reps'
          FROM context c WHERE c.reps > 0
        ), records AS (
          INSERT INTO personal_records(user_id, exercise_id, record_type, record_value, record_unit)
          SELECT c.user_id, c.exercise_id, c.record_type, c.record_value, c.record_unit
          FROM candidates c
          WHERE NOT EXISTS (
            SELECT 1 FROM personal_records p
            WHERE p.user_id = c.user_id AND p.exercise_id = c.exercise_id
              AND p.record_type = c.record_type AND p.record_value >= c.record_value
          )
          RETURNING user_id, exercise_id, record_type, record_value, record_unit
        )
        INSERT INTO notifications(user_id, title, message)
        SELECT c.user_id, 'Personal record achieved',
          e.name || ': ' || c.record_value::text || ' ' || c.record_unit
        FROM records c JOIN exercises e ON e.id = c.exercise_id
      `
      await updateAchievements(req.userId)
    }
    respond(res, set)
  }))

  app.post('/workouts/:id/finish', csrfGuard, asyncRoute(async (req, res) => {
    const [workout] = await sql`
      UPDATE workouts SET status = 'completed', completed_at = coalesce(completed_at, now()),
        duration_minutes = greatest(0, floor(extract(epoch FROM (now() - coalesce(started_at, now()))) / 60)::int)
      WHERE id = ${req.params.id} AND user_id = ${req.userId} AND status = 'in_progress'
      RETURNING id, name, workout_date::text AS workout_date, status, duration_minutes, started_at, completed_at
    `
    if (!workout) return fail(res, 409, 'Only an in-progress workout can be completed.')
    await sql`INSERT INTO notifications(user_id, title, message) VALUES (${req.userId}, 'Workout complete', ${'You completed ' + workout.name + '.'})`
    await updateAchievements(req.userId)
    respond(res, workout)
  }))

  app.get('/workout-history', asyncRoute(async (req, res) => {
    const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20))
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0)
    const from = typeof req.query.from === 'string' ? req.query.from : null
    const to = typeof req.query.to === 'string' ? req.query.to : null
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : null
    const validDate = (value) => {
      if (!value) return true
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
      const date = new Date(`${value}T00:00:00Z`)
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    }
    if (!validDate(from) || !validDate(to)) {
      return fail(res, 400, 'Date filters must use YYYY-MM-DD.')
    }
    const rows = await sql`
      SELECT w.id, w.name, w.workout_date::text AS workout_date, w.status, w.duration_minutes,
        count(DISTINCT we.id)::int AS exercise_count,
        count(ws.id) FILTER (WHERE ws.completed)::int AS completed_sets
      FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
      LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
      WHERE w.user_id = ${req.userId}
        AND (${from}::date IS NULL OR w.workout_date >= ${from}::date)
        AND (${to}::date IS NULL OR w.workout_date <= ${to}::date)
        AND (${search}::text IS NULL OR w.name ILIKE '%' || ${search} || '%')
      GROUP BY w.id ORDER BY w.workout_date DESC, w.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `
    respond(res, rows)
  }))

  app.get('/personal-records', asyncRoute(async (req, res) => {
    const rows = await sql`
      SELECT e.id AS exercise_id, e.name AS exercise_name, p.record_type,
             max(p.record_value) AS record_value, p.record_unit
      FROM personal_records p JOIN exercises e ON e.id = p.exercise_id
      WHERE p.user_id = ${req.userId}
      GROUP BY e.id, e.name, p.record_type, p.record_unit ORDER BY e.name, p.record_type
    `
    respond(res, rows)
  }))

  app.get('/class-bookings', asyncRoute(async (req, res) => {
    const rows = await sql`
      SELECT b.id AS booking_id, b.booking_status, b.booked_at, b.cancelled_at,
        c.id AS class_id, c.title, c.coach_name, c.start_time, c.duration_minutes,
        c.capacity - c.booked_count AS spots_remaining, c.status AS class_status, b.attendance_status
      FROM class_bookings b JOIN classes c ON c.id = b.class_id
      WHERE b.user_id = ${req.userId} ORDER BY c.start_time DESC LIMIT 100
    `
    respond(res, rows)
  }))

  app.post('/class-bookings', csrfGuard, asyncRoute(async (req, res) => {
    const classId = req.body?.classId
    if (typeof classId !== 'string') return fail(res, 400, 'A class is required.')
    const rows = await sql`
      WITH slot AS (
        UPDATE classes SET booked_count = booked_count + 1
        WHERE id = ${classId} AND status = 'active' AND start_time > now() AND booked_count < capacity
        RETURNING id
      ), booking AS (
        INSERT INTO class_bookings(class_id, user_id)
        SELECT id, ${req.userId} FROM slot
        RETURNING id, class_id, user_id, booking_status, booked_at
      ), notice AS (
        INSERT INTO notifications(user_id, title, message)
        SELECT user_id, 'Class booked', 'Your booking is confirmed.'
        FROM booking RETURNING id
      )
      SELECT id, class_id, booking_status, booked_at FROM booking
    `
    if (!rows.length) return fail(res, 409, 'This class is unavailable or full.')
    await updateAchievements(req.userId)
    respond(res, rows[0], 201)
  }))

  app.delete('/class-bookings/:id', csrfGuard, asyncRoute(async (req, res) => {
    const rows = await sql`
      WITH cancelled AS (
        UPDATE class_bookings b SET booking_status = 'cancelled', cancelled_at = now()
        FROM classes c
        WHERE b.id = ${req.params.id} AND b.user_id = ${req.userId}
          AND b.class_id = c.id AND b.booking_status = 'booked'
        RETURNING b.id, b.class_id, b.user_id
      ), freed AS (
        UPDATE classes c SET booked_count = greatest(c.booked_count - 1, 0)
        FROM cancelled WHERE c.id = cancelled.class_id RETURNING c.id
      ), notice AS (
        INSERT INTO notifications(user_id, title, message)
        SELECT user_id, 'Class cancelled', 'Your class booking has been cancelled.'
        FROM cancelled RETURNING id
      )
      SELECT id FROM cancelled
    `
    if (!rows.length) return fail(res, 404, 'Active booking was not found.')
    respond(res, { cancelled: true })
  }))

  app.get('/notifications', asyncRoute(async (req, res) => {
    const rows = await sql`SELECT id, title, message, is_read, created_at FROM notifications WHERE user_id = ${req.userId} ORDER BY created_at DESC LIMIT 50`
    respond(res, rows)
  }))

  app.get('/notifications/unread-count', asyncRoute(async (req, res) => {
    const [result] = await sql`SELECT count(*)::int AS unread_count FROM notifications WHERE user_id = ${req.userId} AND NOT is_read`
    respond(res, result)
  }))

  app.patch('/notifications/read-all', csrfGuard, asyncRoute(async (req, res) => {
    const [result] = await sql`
      WITH updated AS (
        UPDATE notifications SET is_read = true WHERE user_id = ${req.userId} AND NOT is_read RETURNING id
      )
      SELECT count(*)::int AS updated_count FROM updated
    `
    respond(res, { updatedCount: result?.updated_count || 0 })
  }))

  app.patch('/notifications/:id/read', csrfGuard, asyncRoute(async (req, res) => {
    const [notification] = await sql`
      UPDATE notifications SET is_read = true WHERE id = ${req.params.id} AND user_id = ${req.userId}
      RETURNING id, is_read
    `
    if (!notification) return fail(res, 404, 'Notification was not found.')
    respond(res, notification)
  }))

  app.use((req, res) => fail(res, 404, 'API endpoint was not found.'))
  app.use((error, _req, res, _next) => {
    console.error('API request failed:', error?.code || error?.name || 'Unknown error')
    if (error?.code === '23505') return fail(res, 409, 'That record already exists.')
    if (error?.code === '22P02') return fail(res, 400, 'One or more identifiers are invalid.')
    fail(res, 500, 'The service could not complete this request.')
  })

  return app
}
