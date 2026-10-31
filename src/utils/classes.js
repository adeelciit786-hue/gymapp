import { CLASS_TYPES, TIMES } from '../data/trainers'
import { addDays, dateKey } from './stats'

// Deterministic weekly timetable for the next 7 days (local demo data)
export function buildTimetable(bookedIds = []) {
  const out = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i)
    const dk = dateKey(day)
    const n = (day.getDate() + day.getMonth()) % 3 + 2
    for (let k = 0; k < n; k++) {
      const ct = CLASS_TYPES[(day.getDay() * 2 + k * 3 + i) % CLASS_TYPES.length]
      const time = TIMES[(k + i) % TIMES.length]
      const seed = (day.getDate() * 7 + k * 13 + ct.type.length) % 10
      const taken = seed < 2 ? ct.cap : Math.min(ct.cap - 1, Math.floor(ct.cap * (0.35 + seed * 0.06)))
      const id = `${dk}-${time}-${ct.type.replace(/\W/g, '')}`
      const [h, m] = time.split(':').map(Number)
      const start = new Date(day); start.setHours(h, m, 0, 0)
      const isBooked = bookedIds.includes(id)
      out.push({ ...ct, id, dateKey: dk, time, start, taken, isBooked, spots: ct.cap - taken - (isBooked ? 1 : 0), past: start < today })
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

export const classFromId = (id) => buildTimetable([id]).find((c) => c.id === id)
