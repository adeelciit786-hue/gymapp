import { todayWeekday, dateKey } from './stats'

export const startUrl = (planId, dayIdx) => `/app/workout?plan=${encodeURIComponent(planId)}&day=${dayIdx}`

export function todaysWorkout(state) {
  const plan = state.plans.find((p) => p.id === state.activePlanId) || state.plans[0]
  if (!plan || !plan.days.length) return null
  const idx = plan.days.findIndex((d) => d.weekday === todayWeekday())
  const done = state.history.some((h) => h.date === dateKey())
  if (idx >= 0) return { plan, idx, day: plan.days[idx], scheduled: true, done }
  const idx2 = state.history.length % plan.days.length
  return { plan, idx: idx2, day: plan.days[idx2], scheduled: false, done }
}
