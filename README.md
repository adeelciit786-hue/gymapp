# FORGE.

FORGE. is an existing React 19/Vite fitness application with a local Express API and Neon PostgreSQL persistence. The public landing page and member tools retain the project's navy, coral, and glass-card design.

## Local requirements

- Node.js 20.19+ (or 22.12+)
- npm
- A Neon PostgreSQL project and connection string

Install dependencies with:

```powershell
npm install
```

## Environment

Copy `.env.example` to `.env`. Set:

- `DATABASE_URL` to the Neon connection string (server use only)
- `JWT_SECRET` to a long, random signing key (server use only)

Do not prefix either value with `VITE_`. Local `.env` files are ignored by Git and must never be committed. For a Neon connection string, open the project in the Neon console, choose **Connect**, select its branch and database, and copy the connection string directly into `.env`; do not share it in chat.

The local `.env` for this workspace has a generated `JWT_SECRET` and a configured Neon URL. Values are intentionally not documented here.

## Database setup

Run:

```powershell
npm run db:setup
```

The command applies `db/schema.sql`, then repeat-safe seed data in `db/seed.sql`. It does not drop tables, truncate tables, or remove member data. It reports row counts after setup. The seed includes 30 exercises, 10 classes dated in the current database week, and three clearly illustrative membership plans.

To create the predictable test account, explicitly set the local development environment first:

```powershell
$env:NODE_ENV = 'development'
npm run db:test-user
```

Credentials: `test@forge.local` / `Test1234!`. The script refuses to run unless `NODE_ENV=development`; it does not reset or replace an existing account's password.

## Local development

```powershell
npm run dev
```

This runs Vite on `http://localhost:5174` and Express on `127.0.0.1:3001`. Vite proxies `/api` to Express and refuses to silently select another frontend port if `5174` is occupied.

Workout dates, weekly aggregates, streaks, and seeded class weeks use the Neon database calendar (UTC).

## API architecture

`backend/api.js` defines the route handlers and is used by both the local Express server (`backend/server.js`) and the Vercel-compatible function entry (`api/index.js`). Database access and environment variables stay in server-side files.
The Vercel rewrite forwards the requested API path to that shared handler; local development does not require the Vercel CLI.

Implemented API routes include:

- Authentication: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Public: `GET /api/health`, `/api/stats`, `/api/classes`, `/api/membership-plans`
- Member: `/api/dashboard`, `/api/exercises`, `/api/workouts`, `/api/workout-templates`, `/api/sets/:id`, `/api/workout-history`, `/api/personal-records`, `/api/profile`, `/api/class-bookings`, `/api/notifications`, `/api/nutrition`, `/api/nutrition/entries`, `/api/nutrition/targets`, `/api/nutrition/water`, `/api/nutrition/history`, `/api/analytics`, `/api/achievements`, and `/api/settings`
- Admin overview: `/api/admin/summary` and `/api/admin/members` (server-side role check)

Member endpoints require a signed, expiring JWT in an HttpOnly, SameSite=Lax cookie. Mutation requests validate trusted origins. SQL uses parameterized Neon queries, member-owned data is scoped using the verified session subject, and sensitive responses are sent with `Cache-Control: no-store`.

## Database tables

The repeat-safe schema contains the original member/workout/class/membership tables plus workout templates, food catalog and entries, nutrition targets and water logs, member preferences, achievement catalog/awards, and audit-log storage. Migrations use `CREATE ... IF NOT EXISTS` and additive column changes; setup does not reset or delete member data.

## Current integration status

Authentication screens and protected app routes use the database-backed cookie session. Landing statistics, dashboard, exercise library, saved live workouts/history, class booking, profile, and membership inquiry use the API. Workout templates can be created, edited, copied, scheduled as separate workout records, started, and removed while still planned; scheduled workouts appear on the dashboard and preserve completed history. Nutrition entries, targets and water intake are member-scoped database records. Analytics and achievements now use recorded workouts, sets, meals, bookings, and personal records. Settings persist goals and application preferences in Neon. Coach schedule names come from database-backed classes.

The legacy `forge:v1` localStorage record is retained and is not imported into member data. On fresh installs, the local state no longer seeds fabricated workout history, plans, or meals. Theme and sidebar display preferences remain usable. Membership inquiries are stored as `pending`; no payment processing is implemented and no paid membership is activated.

### Admin access

New accounts always receive the `member` role. To promote an existing account, set `NODE_ENV=development` and explicitly set `BOOTSTRAP_ADMIN_EMAIL` in the local shell, then run `npm run db:bootstrap-admin`. This changes the role on the database configured by `DATABASE_URL`; verify it points to the intended development database before running. The admin overview provides protected counts and a searchable member directory. It does not yet provide administrative record changes, class attendance, full audit-log review, or exercise/membership management.

## Testing performed

- Neon `SELECT 1` connectivity passed. `npm run db:setup` was repeated; it reported 30 exercises, 10 classes this week, and three plans without duplicating seeds or changing member records.
- Development test account creation was run twice; the second run preserved the existing account.
- API checks passed for unauthorized access, incorrect password, duplicate signup, authenticated session, exercise filtering, profile updates, set persistence, workout completion/history, personal records/notifications, class booking/duplicate rejection/cancellation, pending membership inquiry, missing-origin CSRF rejection, cross-member workout/set isolation, and simultaneous capacity-limited bookings.
- Expanded database setup was rerun and applied the additive Stage 3 tables/seeds; actual counts remain 30 exercises, 10 classes in the database week, and 3 plans. The schema currently has 22 public tables.
- Authenticated API smoke checks passed for nutrition reads and create/edit/delete, invalid nutrition rejection, settings reads, 7-day analytics, achievements, template creation and scheduling into a workout with copied sets, deletion of a still-planned session/template, and denial of admin metrics to a member (403).
- Admin bootstrap was not run; no account was elevated. Browser inspection confirmed the member sees a clear admin-access denial. Planner, Nutrition, Analytics, Achievements, Settings, and Admin member-directory screens rendered without page exceptions.
- Browser checks passed for login, protected-route redirect and return destination, dashboard/library/live workout, set persistence after refresh, workout completion, and mobile/desktop landing page. No horizontal overflow was observed at 360, 390, 768, 1024, 1366, 1440, or 1920 CSS pixels; selected member screens were also checked at 390 pixels.
- Frontend production build passed.
- `npm audit` reported zero vulnerabilities after a compatible patch update.
- Not tested: a role-authorized admin session using a separate admin account, administrative mutations/audit review, export/account deletion, class attendance management, timed session expiration, Neon outage recovery, all routes at every viewport, or production Vercel runtime. Some legacy demo records remain in localStorage for safe preservation, and are not imported. Private coach consultation workflows and external profile-photo storage are not implemented. No deployment was performed.

## Future Vercel notes

Do not deploy as part of local development. For a future deployment, configure `DATABASE_URL` and `JWT_SECRET` in the Vercel project environment. Trusted-origin checks use the request origin and host; `APP_ORIGIN` may be set to explicitly pin the deployed origin. The Vercel function entry is `api/index.js`; no Vercel CLI login is required for local work.
