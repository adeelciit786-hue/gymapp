import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'

const KEY = 'forge:v1'
export const uid = () => Math.random().toString(36).slice(2, 9)

export function createSeed() {
  return {
    profile: { name: 'Member', goal: 'General Fitness', level: 'Beginner', days: [], weeklyGoal: 3, color: 'orange', membership: null },
    settings: { theme: 'dark' },
    plans: [], activePlanId: null,
    history: [],
    meals: [], water: {},
    targets: { cal: 2200, p: 150, c: 250, f: 70, water: 8 },
    bookings: [], consults: [], seenAch: [],
  }
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
function load() {
  const seed = createSeed()
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (!isObj(raw)) return seed
    const out = { ...seed }
    for (const k of Object.keys(seed)) {
      if (raw[k] === undefined) continue
      if (Array.isArray(seed[k]) ? Array.isArray(raw[k]) : isObj(seed[k]) ? isObj(raw[k]) : typeof raw[k] === typeof seed[k]) out[k] = isObj(seed[k]) ? { ...seed[k], ...raw[k] } : raw[k]
    }
    out.history = out.history.filter((h) => isObj(h) && Array.isArray(h.sets) && typeof h.date === 'string')
    return out
  } catch { return seed }
}

function reducer(s, a) {
  switch (a.type) {
    case 'profile': return { ...s, profile: { ...s.profile, ...a.v } }
    case 'theme': return { ...s, settings: { ...s.settings, theme: a.v } }
    case 'savePlan': return { ...s, plans: s.plans.some((p) => p.id === a.v.id) ? s.plans.map((p) => (p.id === a.v.id ? a.v : p)) : [...s.plans, a.v], activePlanId: s.activePlanId || a.v.id }
    case 'deletePlan': { const plans = s.plans.filter((p) => p.id !== a.id); return { ...s, plans, activePlanId: s.activePlanId === a.id ? plans[0]?.id || null : s.activePlanId } }
    case 'activePlan': return { ...s, activePlanId: a.id }
    case 'workout': return { ...s, history: [...s.history, a.v] }
    case 'addMeal': return { ...s, meals: [...s.meals, a.v] }
    case 'editMeal': return { ...s, meals: s.meals.map((m) => (m.id === a.v.id ? a.v : m)) }
    case 'delMeal': return { ...s, meals: s.meals.filter((m) => m.id !== a.id) }
    case 'water': return { ...s, water: { ...s.water, [a.date]: Math.max(0, (s.water[a.date] || 0) + a.n) } }
    case 'targets': return { ...s, targets: { ...s.targets, ...a.v } }
    case 'book': return s.bookings.includes(a.id) ? s : { ...s, bookings: [...s.bookings, a.id] }
    case 'cancel': return { ...s, bookings: s.bookings.filter((b) => b !== a.id) }
    case 'consult': return { ...s, consults: [a.v, ...s.consults] }
    case 'delConsult': return { ...s, consults: s.consults.filter((c) => c.id !== a.id) }
    case 'membership': return { ...s, profile: { ...s.profile, membership: a.v } }
    case 'seen': return { ...s, seenAch: [...new Set([...s.seenAch, ...a.ids])] }
    case 'reset': return createSeed()
    default: return s
  }
}

const Ctx = createContext(null)
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, load)
  const first = useRef(true)
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.settings.theme === 'dark' ? '#101B2A' : '#F5F4F0')
  }, [state.settings.theme])
  useEffect(() => {
    if (first.current) { first.current = false }
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full or blocked */ }
  }, [state])
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useStore = () => useContext(Ctx)
