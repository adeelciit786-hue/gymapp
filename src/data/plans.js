const d = (name, ids) => ({ name, exercises: ids.map((id) => ({ id })) })

export const GOALS = ['Muscle Building', 'Strength', 'Fat Loss', 'General Fitness', 'Endurance']
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced']

export const TEMPLATES = [
  { id: 'ppl', name: 'Push / Pull / Legs', goal: 'Muscle Building', level: 'Intermediate', blurb: 'Classic 3-day split hitting each muscle group with focus.', days: [
    d('Push', ['bench', 'ohp', 'dbpress', 'lateral', 'pushdown']),
    d('Pull', ['deadlift', 'pullup', 'row', 'facepull', 'curl']),
    d('Legs', ['squat', 'rdl', 'legpress', 'calf', 'plank']),
  ] },
  { id: 'fullbody', name: 'Full Body', goal: 'General Fitness', level: 'Beginner', blurb: 'Efficient whole-body sessions, ideal for 2–3 days a week.', days: [
    d('Full Body A', ['squat', 'bench', 'latpd', 'plank']),
    d('Full Body B', ['rdl', 'ohp', 'dbrow', 'crunch']),
  ] },
  { id: 'upperlower', name: 'Upper / Lower', goal: 'Strength', level: 'Intermediate', blurb: 'Four-day split balancing heavy upper and lower work.', days: [
    d('Upper', ['bench', 'row', 'ohp', 'pullup', 'curl']),
    d('Lower', ['squat', 'rdl', 'lunge', 'calf', 'legraise']),
  ] },
  { id: 'beginner', name: 'Beginner Strength', goal: 'Strength', level: 'Beginner', blurb: 'Learn the fundamentals with simple, repeatable sessions.', days: [
    d('Day A', ['legpress', 'pushup', 'latpd', 'plank']),
    d('Day B', ['lunge', 'dbpress', 'dbrow', 'russian']),
  ] },
  { id: 'functional', name: 'Functional Fitness', goal: 'Endurance', level: 'Intermediate', blurb: 'Movement-focused conditioning for everyday athleticism.', days: [
    d('Engine', ['kbswing', 'burpee', 'rower', 'plank']),
    d('Strength Flow', ['thruster', 'lunge', 'turkish', 'pushup']),
  ] },
]

const SPLITS = {
  2: [['Full Body A', ['Chest', 'Back', 'Legs', 'Shoulders']], ['Full Body B', ['Legs', 'Back', 'Chest', 'Arms']]],
  3: [['Push', ['Chest', 'Shoulders', 'Arms']], ['Pull', ['Back', 'Back', 'Arms']], ['Legs', ['Legs', 'Legs', 'Core']]],
  4: [['Upper A', ['Chest', 'Back', 'Shoulders', 'Arms']], ['Lower A', ['Legs', 'Legs', 'Core']], ['Upper B', ['Back', 'Chest', 'Shoulders', 'Arms']], ['Lower B', ['Legs', 'Legs', 'Core']]],
  5: [['Push', ['Chest', 'Shoulders', 'Arms']], ['Pull', ['Back', 'Back', 'Arms']], ['Legs', ['Legs', 'Legs', 'Core']], ['Upper', ['Chest', 'Back', 'Shoulders']], ['Lower + Core', ['Legs', 'Legs', 'Core']]],
}

// Local rules-based split generator (no AI / backend)
export function generatePlan({ goal, level, days, equipment, duration }, EXERCISES) {
  const perDay = Math.max(3, Math.min(8, Math.round(duration / 9)))
  const allowed = EXERCISES.filter((x) => equipment.includes(x.equip) && (level === 'Beginner' ? x.diff !== 'Advanced' : true))
  const pool = allowed.length >= 8 ? allowed : EXERCISES.filter((x) => x.diff !== 'Advanced')
  const n = Math.min(Math.max(days, 2), 6)
  const base = SPLITS[Math.min(n, 5)]
  const cardio = pool.filter((x) => x.group === 'Cardio' || x.group === 'Full Body')
  const out = []
  for (let k = 0; k < n; k++) {
    const [name, groups] = base[k % base.length]
    const used = new Set()
    const pick = (group, i) => {
      const g = pool.filter((x) => x.group === group && !used.has(x.id))
      const list = g.length ? g : pool.filter((x) => !used.has(x.id))
      const x = list[i % list.length]
      used.add(x.id)
      return x.id
    }
    const ids = []
    if ((goal === 'Fat Loss' || goal === 'Endurance') && cardio.length) {
      for (let j = 0; j < 2; j++) { const c = cardio[(k + j) % cardio.length]; if (!used.has(c.id)) { used.add(c.id); ids.push(c.id) } }
    }
    groups.forEach((g, i) => ids.push(pick(g, k + i)))
    let guard = 0
    while (ids.length < perDay && guard++ < 20) ids.push(pick(['Core', 'Full Body', 'Legs', 'Back'][ids.length % 4], k))
    out.push({ name: n === 6 && k === 5 ? 'Active Recovery' : name, exercises: ids.slice(0, perDay).map((id) => ({ id })) })
  }
  return out
}
