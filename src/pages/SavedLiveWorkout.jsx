import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { Check, Clock3, Dumbbell, Play, Trophy } from 'lucide-react'
import { Button, Card, Empty, Logo, PageHeader, Skeleton } from '../components/ui'
import { useToast } from '../context/toast'
import { apiRequest } from '../utils/api'

export default function SavedLiveWorkout({ workoutId }) {
  const toast = useToast()
  const [workout, setWorkout] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [rest, setRest] = useState(0)
  const [reps, setReps] = useState('')
  const [weightKg, setWeightKg] = useState('')

  const load = () => apiRequest(`/workouts?id=${encodeURIComponent(workoutId)}`).then(setWorkout)
  useEffect(() => {
    let active = true
    apiRequest(`/workouts?id=${encodeURIComponent(workoutId)}`)
      .then((result) => { if (active) setWorkout(result) })
      .catch((issue) => { if (active) setError(issue.message) })
    return () => { active = false }
  }, [workoutId])
  useEffect(() => {
    if (!workout?.started_at || workout.status !== 'in_progress') return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [workout?.started_at, workout?.status])
  useEffect(() => {
    if (!rest) return undefined
    const timer = setInterval(() => setRest((remaining) => Math.max(0, remaining - 1)), 1000)
    return () => clearInterval(timer)
  }, [rest > 0])

  const sets = useMemo(() => workout?.exercises?.flatMap((exercise) => exercise.workoutSets.map((set) => ({ ...set, exercise }))) || [], [workout])
  const nextSet = sets.find((set) => !set.completed)
  const completedSets = sets.filter((set) => set.completed).length
  const elapsed = workout?.started_at ? Math.max(0, Math.floor((now - new Date(workout.started_at).getTime()) / 1000)) : 0
  const clock = `${String(Math.floor(elapsed / 3600)).padStart(2, '0')}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  const start = async () => {
    setBusy(true)
    setError('')
    try { await apiRequest(`/workouts/${workoutId}/start`, { method: 'POST', body: '{}' }); await load() }
    catch (issue) { setError(issue.message) }
    finally { setBusy(false) }
  }

  const completeSet = async () => {
    if (!nextSet || busy) return
    const previous = workout
    const optimistic = {
      ...workout,
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        workoutSets: exercise.workoutSets.map((set) => set.id === nextSet.id
          ? { ...set, completed: true, completedAt: new Date().toISOString(), reps: reps === '' ? set.reps : Number(reps), weightKg: weightKg === '' ? set.weightKg : Number(weightKg) }
          : set),
      })),
    }
    setWorkout(optimistic)
    setBusy(true)
    try {
      await apiRequest(`/sets/${nextSet.id}`, { method: 'PATCH', body: JSON.stringify({
        completed: true,
        ...(reps !== '' ? { reps: Number(reps) } : {}),
        ...(weightKg !== '' ? { weightKg: Number(weightKg) } : {}),
      }) })
      setRest(nextSet.exercise.restSeconds || 0)
      setReps('')
      setWeightKg('')
      toast('Set saved')
    } catch (issue) {
      setWorkout(previous)
      toast(issue.message || 'Set could not be saved.', 'error')
    } finally { setBusy(false) }
  }

  const finish = async () => {
    if (busy || workout.status !== 'in_progress') return
    setBusy(true)
    try {
      const completed = await apiRequest(`/workouts/${workoutId}/finish`, { method: 'POST', body: '{}' })
      setWorkout({ ...workout, ...completed })
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        confetti({ particleCount: 100, spread: 75, origin: { y: 0.65 }, colors: ['#FF7049', '#E8B86D', '#F5F4F0'] })
      }
      toast('Workout complete. Great work!')
    } catch (issue) {
      toast(issue.message || 'Workout could not be completed.', 'error')
    } finally { setBusy(false) }
  }

  if (!workout && !error) return <div className="max-w-2xl mx-auto p-5 space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-64" /></div>
  if (!workout) return <div className="max-w-2xl mx-auto p-5"><Empty title="Workout unavailable" text={error} action={<Button as={Link} to="/app">Back to dashboard</Button>} /></div>

  return (
    <div className="min-h-screen bg-bg px-4 py-5 sm:py-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="flex items-center justify-between"><Logo /><Button as={Link} to="/app" variant="ghost">Dashboard</Button></header>
        <PageHeader eyebrow={workout.status.replace('_', ' ')} title={workout.name} sub={`${workout.exercises.length} exercises · Saved to your account`} />
        <div className="grid grid-cols-3 gap-3 text-center">
          <Card className="!p-3"><p className="text-[11px] uppercase text-mute">Time</p><p className="font-display text-xl sm:text-2xl font-bold tabular-nums">{clock}</p></Card>
          <Card className="!p-3"><p className="text-[11px] uppercase text-mute">Sets</p><p className="font-display text-xl sm:text-2xl font-bold">{completedSets}/{sets.length}</p></Card>
          <Card className="!p-3"><p className="text-[11px] uppercase text-mute">Progress</p><p className="font-display text-xl sm:text-2xl font-bold text-brand">{sets.length ? Math.round(completedSets / sets.length * 100) : 0}%</p></Card>
        </div>

        {workout.status === 'completed' ? (
          <Card className="text-center py-10"><Trophy className="mx-auto text-gold mb-3" size={40} /><p className="eyebrow">Workout complete</p><h2 className="h-display text-4xl mt-2">Forged.</h2><p className="text-mute mt-2">{workout.duration_minutes ?? 0} minutes · {completedSets} sets completed</p><Button as={Link} to="/app" className="mt-6">Back to dashboard</Button></Card>
        ) : <>
          {workout.status === 'planned' && <Card className="text-center"><p className="text-mute text-sm mb-4">Start when you are ready. Your start time will be saved for resuming.</p><Button size="lg" onClick={start} disabled={busy}><Play size={18} fill="currentColor" />Start workout</Button></Card>}
          <div className="space-y-3">
            {workout.exercises.map((exercise, index) => (
              <Card key={exercise.id} className="!p-4 sm:!p-5">
                <div className="flex items-start gap-3"><Dumbbell className="text-brand mt-1 shrink-0" size={19} /><div className="min-w-0 flex-1"><h2 className="font-bold">{index + 1}. {exercise.name}</h2><p className="text-xs text-mute mt-1">{exercise.sets} × {exercise.reps} · {exercise.restSeconds}s rest</p></div></div>
                <div className="flex flex-wrap gap-2 mt-4">{exercise.workoutSets.map((set) => <span key={set.id} className={`rounded-lg px-3 py-2 text-xs ${set.completed ? 'bg-brand/15 text-brand' : 'bg-ink/5 text-mute'}`}>Set {set.setNumber} {set.completed && <Check size={12} className="inline" />}</span>)}</div>
              </Card>
            ))}
          </div>
          {workout.status === 'in_progress' && <>
            <Card className="space-y-4">
              <div className="flex items-center gap-2"><Clock3 className="text-gold" size={18} /><h2 className="font-bold">{rest ? `Rest · ${rest}s` : nextSet ? `${nextSet.exercise.name} · Set ${nextSet.setNumber}` : 'All sets completed'}</h2></div>
              {nextSet && <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-mute">Reps<input aria-label="Repetitions" className="input mt-1" type="number" min="0" max="1000" value={reps} onChange={(event) => setReps(event.target.value)} /></label>
                {nextSet.exercise.muscleGroup !== 'Cardio' && <label className="text-xs text-mute">Weight (kg)<input aria-label="Weight in kilograms" className="input mt-1" type="number" min="0" max="10000" step="0.5" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} /></label>}
              </div>}
              <div className="flex flex-col sm:flex-row gap-3">
                {rest > 0 && <Button variant="ghost" onClick={() => setRest(0)}>Skip rest</Button>}
                {nextSet && <Button onClick={completeSet} disabled={busy || rest > 0}><Check size={17} />{busy ? 'Saving…' : rest ? 'Resting' : 'Complete set'}</Button>}
                <Button variant="ghost" onClick={finish} disabled={busy || !sets.length}>{busy ? 'Saving…' : 'Finish workout'}</Button>
              </div>
            </Card>
          </>}
        </>}
      </div>
    </div>
  )
}
