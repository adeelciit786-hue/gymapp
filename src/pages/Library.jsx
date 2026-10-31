import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Clock, Dumbbell, Info, Plus, Search, SearchX, Trash2 } from 'lucide-react'
import { Button, Card, Chip, Empty, Modal, PageHeader, Skeleton } from '../components/ui'
import { useToast } from '../context/toast'
import { apiRequest } from '../utils/api'

const GROUPS = ['Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio']
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']
const DIFF = { Beginner: 'text-emerald-400 bg-emerald-400/10', Intermediate: 'text-gold bg-gold/10', Advanced: 'text-red-400 bg-red-400/10' }
const GRAD = { Chest: 'from-orange-500/30', Back: 'from-sky-500/30', Legs: 'from-emerald-500/30', Arms: 'from-pink-500/30', Core: 'from-amber-500/30', Cardio: 'from-red-500/30' }
const utcToday = () => new Date().toISOString().slice(0, 10)

export default function Library() {
  const toast = useToast()
  const [exercises, setExercises] = useState([])
  const [workout, setWorkout] = useState(null)
  const [completedToday, setCompletedToday] = useState(false)
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [equipment, setEquipment] = useState('All')
  const [sel, setSel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  const refreshWorkout = async () => {
    const rows = await apiRequest('/workouts')
    const todays = rows.filter((item) => item.workout_date === utcToday())
    setWorkout(todays.find((item) => item.status === 'planned' || item.status === 'in_progress') || null)
    setCompletedToday(todays.some((item) => item.status === 'completed'))
  }

  useEffect(() => {
    let active = true
    Promise.all([apiRequest('/exercises'), apiRequest('/workouts')])
      .then(([items, workouts]) => {
        if (!active) return
        setExercises(items)
        const todays = workouts.filter((item) => item.workout_date === utcToday())
        setWorkout(todays.find((item) => item.status === 'planned' || item.status === 'in_progress') || null)
        setCompletedToday(todays.some((item) => item.status === 'completed'))
      })
      .catch((issue) => { if (active) setError(issue.message || 'The exercise library is unavailable.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const equipmentOptions = useMemo(() => [...new Set(exercises.map((item) => item.equipment))].sort(), [exercises])
  const list = useMemo(() => exercises.filter((item) =>
    (group === 'All' || item.muscle_group === group) &&
    (difficulty === 'All' || item.difficulty === difficulty) &&
    (equipment === 'All' || item.equipment === equipment) &&
    `${item.name} ${item.muscle_group} ${item.equipment}`.toLowerCase().includes(q.trim().toLowerCase())
  ), [exercises, group, difficulty, equipment, q])

  const addToWorkout = async (exercise) => {
    if (working) return
    setWorking(true)
    try {
      let selectedWorkout = workout
      if (selectedWorkout?.status === 'in_progress') {
        toast('Finish the in-progress workout before editing it.', 'error')
        return
      }
      if (!selectedWorkout) {
        if (completedToday && !window.confirm('Today’s workout is complete. Create a separate new session? The completed workout will remain unchanged.')) return
        selectedWorkout = await apiRequest('/workouts', { method: 'POST', body: JSON.stringify({ name: 'Today’s workout' }) })
      }
      await apiRequest(`/workouts/${selectedWorkout.id}/exercises`, { method: 'POST', body: JSON.stringify({ exerciseId: exercise.id }) })
      await refreshWorkout()
      toast(`Added ${exercise.name} to today’s workout`)
    } catch (issue) {
      toast(issue.message || 'Exercise could not be added.', 'error')
    } finally { setWorking(false) }
  }

  const removeExercise = async (exerciseId) => {
    if (!workout || working) return
    setWorking(true)
    try {
      await apiRequest(`/workouts/${workout.id}/exercises/${encodeURIComponent(exerciseId)}`, { method: 'DELETE' })
      await refreshWorkout()
      toast('Exercise removed')
    } catch (issue) { toast(issue.message || 'Exercise could not be removed.', 'error') }
    finally { setWorking(false) }
  }

  const moveExercise = async (index, direction) => {
    if (!workout || working) return
    const next = [...workout.exercises]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setWorking(true)
    try {
      await apiRequest(`/workouts/${workout.id}/reorder`, { method: 'PATCH', body: JSON.stringify({ exerciseIds: next.map((item) => item.exerciseId) }) })
      await refreshWorkout()
    } catch (issue) { toast(issue.message || 'Exercise order could not be saved.', 'error') }
    finally { setWorking(false) }
  }

  const cardExercise = (item) => ({
    ...item,
    group: item.muscle_group,
    diff: item.difficulty,
    equip: item.equipment,
    target: item.description,
    rest: item.rest_seconds,
    steps: item.instructions || [],
  })

  if (loading) return <div className="space-y-4"><Skeleton className="h-14 w-2/3" /><Skeleton className="h-12" /><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2, 3].map((n) => <Skeleton className="h-56" key={n} />)}</div></div>
  if (error) return <Empty title="Exercise library unavailable" text={error} action={<Button onClick={() => window.location.reload()}>Try again</Button>} />

  return (
    <div>
      <PageHeader eyebrow="Exercise library" title="Find your movement" sub={`${exercises.length} exercises from the FORGE. database.`} />
      {workout && <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><p className="eyebrow mb-1">Today’s session</p><h2 className="font-bold">{workout.name}</h2></div><span className="text-xs text-mute capitalize">{workout.status.replace('_', ' ')}</span></div>
        {workout.exercises.length ? <ul className="space-y-2">{workout.exercises.map((item, index) => <li key={item.id} className="flex items-center gap-2 rounded-xl bg-bg/50 p-2.5">
          <span className="flex-1 min-w-0 text-sm truncate">{index + 1}. {item.name}</span>
          <button aria-label={`Move ${item.name} up`} disabled={working || index === 0} onClick={() => moveExercise(index, -1)} className="p-2 rounded-lg text-mute hover:text-ink disabled:opacity-30"><ArrowUp size={16} /></button>
          <button aria-label={`Move ${item.name} down`} disabled={working || index === workout.exercises.length - 1} onClick={() => moveExercise(index, 1)} className="p-2 rounded-lg text-mute hover:text-ink disabled:opacity-30"><ArrowDown size={16} /></button>
          <button aria-label={`Remove ${item.name}`} disabled={working} onClick={() => removeExercise(item.exerciseId)} className="p-2 rounded-lg text-mute hover:text-red-400 disabled:opacity-30"><Trash2 size={16} /></button>
        </li>)}</ul> : <p className="text-sm text-mute">No exercises added yet.</p>}
      </Card>}
      <div className="relative mb-4"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" /><input className="input !pl-11" placeholder="Search by name, muscle or equipment…" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search exercises" /></div>
      <div className="space-y-3 mb-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">{['All', ...GROUPS].map((item) => <Chip key={item} active={group === item} onClick={() => setGroup(item)}>{item}</Chip>)}</div>
        <div className="flex flex-wrap gap-2">{['All', ...DIFFICULTIES].map((item) => <Chip key={item} active={difficulty === item} onClick={() => setDifficulty(item)}>{item}</Chip>)}</div>
        <label className="block max-w-xs text-xs text-mute">Equipment
          <select className="input mt-1" value={equipment} onChange={(event) => setEquipment(event.target.value)}><option>All</option>{equipmentOptions.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
      </div>
      {list.length === 0 ? <Empty icon={SearchX} title="No exercises found" text="Try a different search or filter." action={<Button variant="ghost" onClick={() => { setQ(''); setGroup('All'); setDifficulty('All'); setEquipment('All') }}>Clear filters</Button>} /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((raw) => {
            const item = cardExercise(raw)
            return <button key={item.id} onClick={() => setSel(item)} className="text-left surface lift overflow-hidden group">
              <div className={`h-28 bg-gradient-to-br ${GRAD[item.group]} to-transparent relative flex items-center justify-center`}><Dumbbell size={44} className="text-ink/30 transition group-hover:scale-110 group-hover:rotate-12" /><span className="absolute top-3 left-3 text-[11px] font-semibold uppercase tracking-wider bg-bg/70 rounded-full px-2.5 py-1">{item.group}</span><span className={`absolute top-3 right-3 text-[11px] font-semibold rounded-full px-2.5 py-1 ${DIFF[item.diff]}`}>{item.diff}</span></div>
              <div className="p-4"><h3 className="font-bold text-lg leading-tight">{item.name}</h3><p className="text-xs text-mute mt-1">{item.equip}</p><div className="flex gap-4 mt-4 text-xs text-mute"><span>{item.sets} × {item.reps}</span><span className="flex items-center gap-1"><Clock size={14} className="text-brand" />{item.rest ? `${item.rest}s rest` : 'Continuous'}</span></div></div>
            </button>
          })}
        </div>
      )}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.name || ''}>
        {sel && <div className="space-y-5">
          <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-brand/15 text-brand px-3 py-1 font-semibold">{sel.group}</span><span className={`rounded-full px-3 py-1 font-semibold ${DIFF[sel.diff]}`}>{sel.diff}</span><span className="rounded-full bg-ink/10 px-3 py-1">{sel.equip}</span></div>
          <div className="grid grid-cols-3 gap-3 text-center">{[['Sets', sel.sets], ['Reps', sel.reps], ['Rest', sel.rest ? `${sel.rest}s` : '—']].map(([label, value]) => <div key={label} className="rounded-xl bg-bg/50 p-3"><p className="font-display text-xl font-bold">{value}</p><p className="text-xs text-mute">{label}</p></div>)}</div>
          <p className="text-sm text-mute">{sel.target}</p>
          <div><h3 className="font-bold mb-2">How to perform</h3><ol className="space-y-2">{sel.steps.map((step, index) => <li key={index} className="flex gap-3 text-sm"><span className="w-6 h-6 rounded-full bg-brand text-[#101B2A] text-xs font-bold flex items-center justify-center shrink-0">{index + 1}</span>{step}</li>)}</ol></div>
          <div className="rounded-xl bg-gold/10 border border-gold/30 p-4"><h3 className="font-bold text-sm flex items-center gap-2 mb-1.5"><Info size={16} className="text-gold" />Form guidance</h3><p className="text-sm text-mute">Use a controlled range of motion and adjust the movement to your ability.</p></div>
          <div className="flex gap-2"><Button disabled={working || workout?.status === 'in_progress'} onClick={() => addToWorkout(sel)} className="flex-1"><Plus size={16} />{working ? 'Saving…' : 'Add to today’s workout'}</Button><Button variant="ghost" onClick={() => setSel(null)}>Close</Button></div>
        </div>}
      </Modal>
    </div>
  )
}
