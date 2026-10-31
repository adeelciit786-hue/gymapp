import { exById } from '../data/exercises'

const pad = (n) => String(n).padStart(2, '0')
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const daysAgoKey = (n) => dateKey(addDays(new Date(), -n))
export const startOfWeek = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
export const dayDiff = (a, b) => Math.round((new Date(a).setHours(0, 0, 0, 0) - new Date(b).setHours(0, 0, 0, 0)) / 864e5)
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const todayWeekday = () => WEEKDAYS[(new Date().getDay() + 6) % 7]
export const fmtDur = (s) => { const m = Math.floor(s / 60); const h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m ${pad(Math.floor(s % 60))}s` }
export const clock = (s) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`
export const num = (n) => Math.round(n).toLocaleString('en-US')

export const volumeOf = (w) => w.sets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0)

export function streaks(history) {
  const days = [...new Set(history.map((h) => h.date))].sort()
  let best = 0, run = 0, prev = null
  for (const d of days) {
    run = prev && dayDiff(d, prev) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  const set = new Set(days)
  let current = 0
  let cursor = new Date()
  if (!set.has(dateKey(cursor))) cursor = addDays(cursor, -1)
  while (set.has(dateKey(cursor))) { current++; cursor = addDays(cursor, -1) }
  return { current, best }
}

export function weekStats(history, goal = 4) {
  const start = dateKey(startOfWeek())
  const w = history.filter((h) => h.date >= start)
  const sessions = w.length
  return {
    sessions,
    kcal: w.reduce((a, h) => a + h.kcal, 0),
    minutes: Math.round(w.reduce((a, h) => a + h.durationSec, 0) / 60),
    volume: w.reduce((a, h) => a + volumeOf(h), 0),
    pct: Math.min(100, Math.round((sessions / Math.max(goal, 1)) * 100)),
    byDay: WEEKDAYS.map((d, i) => {
      const key = dateKey(addDays(startOfWeek(), i))
      const items = history.filter((h) => h.date === key)
      return { day: d, minutes: Math.round(items.reduce((a, h) => a + h.durationSec, 0) / 60), kcal: items.reduce((a, h) => a + h.kcal, 0) }
    }),
  }
}

export function prs(history) {
  const best = {}
  for (const w of history) for (const s of w.sets) {
    if (!s.weight) continue
    const cur = best[s.exId]
    if (!cur || s.weight > cur.weight) best[s.exId] = { exId: s.exId, name: exById[s.exId]?.name || s.exId, weight: s.weight, reps: s.reps, date: w.date }
  }
  return Object.values(best).sort((a, b) => b.weight - a.weight)
}

export function achievements(state) {
  const h = state.history
  const total = h.length
  const mins = Math.round(h.reduce((a, x) => a + x.durationSec, 0) / 60)
  const { best } = streaks(h)
  const maxW = h.reduce((m, w) => Math.max(m, ...w.sets.map((s) => s.weight || 0), 0), 0)
  let goodWeeks = 0
  for (let i = 0; i < 4; i++) {
    const to = daysAgoKey(i * 7), from = daysAgoKey(i * 7 + 6)
    if (h.filter((x) => x.date >= from && x.date <= to).length >= 3) goodWeeks++
  }
  const mk = (id, title, desc, value, goal, icon) => ({ id, title, desc, value: Math.min(value, goal), goal, unlocked: value >= goal, icon })
  return [
    mk('first', 'First Workout', 'Complete your first session.', total, 1, 'flag'),
    mk('streak5', '5 Workout Streak', 'Train 5 days in a row.', best, 5, 'flame'),
    mk('ten', '10 Workouts Completed', 'Log ten completed sessions.', total, 10, 'dumbbell'),
    mk('mins', '1,000 Active Minutes', 'Accumulate 1,000 minutes training.', mins, 1000, 'timer'),
    mk('strength', 'Strength Milestone', 'Lift 100 kg or more in a single set.', maxW, 100, 'trophy'),
    mk('champ', 'Consistency Champion', 'Hit 3+ workouts in each of the last 4 weeks.', goodWeeks, 4, 'crown'),
  ]
}

export function challenges(state) {
  const w = weekStats(state.history, state.profile.weeklyGoal)
  const waterDays = WEEKDAYS.filter((_, i) => (state.water[dateKey(addDays(startOfWeek(), i))] || 0) >= 8).length
  const mk = (id, title, desc, value, goal, unit) => ({ id, title, desc, value: Math.min(value, goal), goal, unit, done: value >= goal })
  return [
    mk('c1', 'Three-Peat', 'Complete 3 workouts this week.', w.sessions, 3, 'workouts'),
    mk('c2', 'Burn Notice', 'Burn 1,200 kcal this week.', w.kcal, 1200, 'kcal'),
    mk('c3', 'Iron Tonnage', 'Lift 8,000 kg total volume this week.', w.volume, 8000, 'kg'),
    mk('c4', 'Hydration Hero', 'Drink 8 glasses of water on 4 days.', waterDays, 4, 'days'),
  ]
}

export const kcalForWorkout = (durationSec, sets) => Math.round((durationSec / 60) * 6 + sets.length * 4)
