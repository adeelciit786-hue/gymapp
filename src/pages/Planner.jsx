import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronDown, ChevronUp, Copy, Pencil, Play, Plus, Save, Trash2, X } from 'lucide-react'
import { Button, Card, Chip, Empty, Field, PageHeader, Skeleton } from '../components/ui'
import { apiRequest } from '../utils/api'
import { useToast } from '../context/toast'
import { WEEKDAYS, dateKey } from '../utils/stats'

const blankTemplate = () => ({ name: '', goal: 'General Fitness', experienceLevel: 'Beginner', trainingDays: [], exercises: [] })

export default function Planner() {
  const toast = useToast()
  const [templates, setTemplates] = useState(null)
  const [exercises, setExercises] = useState([])
  const [sessions, setSessions] = useState([])
  const [draft, setDraft] = useState(null)
  const [scheduleDates, setScheduleDates] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const [savedTemplates, exerciseList, workouts] = await Promise.all([
        apiRequest('/workout-templates'),
        apiRequest('/exercises'),
        apiRequest('/workouts'),
      ])
      setTemplates(savedTemplates)
      setExercises(exerciseList)
      setSessions(workouts.filter((workout) => workout.status !== 'completed'))
    } catch (issue) { setError(issue.message || 'Workout plans could not be loaded.') }
  }
  useEffect(() => { load() }, [])

  const openNew = () => setDraft(blankTemplate())
  const edit = (template) => setDraft({
    id: template.id,
    name: template.name,
    goal: template.goal,
    experienceLevel: template.experience_level,
    trainingDays: template.training_days || [],
    exercises: template.exercises.map((item) => ({
      id: item.id, exerciseId: item.exerciseId, name: item.name, sets: item.sets,
      reps: item.reps, restSeconds: item.restSeconds, orderIndex: item.orderIndex,
    })),
  })

  const save = async () => {
    if (!draft?.name.trim()) return toast('Name your workout template first.', 'error')
    if (!draft.exercises.length) return toast('Add at least one exercise.', 'error')
    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(), goal: draft.goal, experienceLevel: draft.experienceLevel,
        trainingDays: draft.trainingDays,
        exercises: draft.exercises.map(({ exerciseId, sets, reps, restSeconds }) => ({ exerciseId, sets: Number(sets), reps: String(reps), restSeconds: Number(restSeconds) })),
      }
      if (!draft.id) {
        await apiRequest('/workout-templates', { method: 'POST', body: JSON.stringify(payload) })
      } else {
        await apiRequest(`/workout-templates/${draft.id}`, { method: 'PUT', body: JSON.stringify({
          name: payload.name, goal: payload.goal, experienceLevel: payload.experienceLevel, trainingDays: payload.trainingDays,
        }) })
        const existingIds = new Set(draft.exercises.filter((item) => item.id).map((item) => item.id))
        const old = templates.find((item) => item.id === draft.id)
        const oldIds = new Set(old.exercises.map((item) => item.id))
        for (const item of old.exercises) {
          if (!existingIds.has(item.id)) await apiRequest(`/workout-templates/${draft.id}/exercises/${item.id}`, { method: 'DELETE' })
        }
        const rowIds = []
        for (const item of draft.exercises) {
          if (item.id && oldIds.has(item.id)) {
            await apiRequest(`/workout-templates/${draft.id}/exercises/${item.id}`, { method: 'PUT', body: JSON.stringify({
              sets: Number(item.sets), reps: String(item.reps), restSeconds: Number(item.restSeconds),
            }) })
            rowIds.push(item.id)
          } else {
            const added = await apiRequest(`/workout-templates/${draft.id}/exercises`, { method: 'POST', body: JSON.stringify({
              exerciseId: item.exerciseId, sets: Number(item.sets), reps: String(item.reps), restSeconds: Number(item.restSeconds),
            }) })
            rowIds.push(added.id)
          }
        }
        await apiRequest(`/workout-templates/${draft.id}/reorder`, { method: 'PATCH', body: JSON.stringify({ exerciseRowIds: rowIds }) })
      }
      setDraft(null)
      await load()
      toast('Workout template saved.')
    } catch (issue) {
      await load()
      toast(issue.message || 'Some changes may have saved. Review the refreshed data and retry.', 'error')
    } finally { setSaving(false) }
  }

  const addExercise = (id) => {
    if (!id || draft.exercises.some((item) => item.exerciseId === id)) return
    const exercise = exercises.find((item) => item.id === id)
    if (!exercise) return
    setDraft((current) => ({ ...current, exercises: [...current.exercises, {
      exerciseId: id, name: exercise.name, sets: exercise.sets, reps: exercise.reps,
      restSeconds: exercise.rest_seconds, orderIndex: current.exercises.length,
    }] }))
  }

  const schedule = async (template) => {
    const date = scheduleDates[template.id] || dateKey()
    setSaving(true)
    try {
      await apiRequest(`/workout-templates/${template.id}/schedule`, { method: 'POST', body: JSON.stringify({ date }) })
      await load()
      toast(`Scheduled ${template.name} for ${date}.`)
    } catch (issue) { toast(issue.message || 'Workout could not be scheduled.', 'error') }
    finally { setSaving(false) }
  }

  const duplicate = async (template) => {
    try {
      await apiRequest('/workout-templates', { method: 'POST', body: JSON.stringify({
        name: `${template.name} copy`, goal: template.goal,
        experienceLevel: template.experience_level, trainingDays: template.training_days,
        exercises: template.exercises.map(({ exerciseId, sets, reps, restSeconds }) => ({ exerciseId, sets, reps, restSeconds })),
      }) })
      await load()
      toast('Template duplicated.')
    } catch (issue) { toast(issue.message || 'Template could not be duplicated.', 'error') }
  }

  const remove = async (template) => {
    if (!window.confirm(`Delete the template “${template.name}”? Existing scheduled and completed workout records will remain.`)) return
    try {
      await apiRequest(`/workout-templates/${template.id}`, { method: 'DELETE' })
      await load()
      toast('Template deleted.')
    } catch (issue) { toast(issue.message || 'Template could not be deleted.', 'error') }
  }

  const removeScheduledWorkout = async (workout) => {
    if (!window.confirm(`Remove the planned workout “${workout.name}”? Completed history cannot be deleted here.`)) return
    try {
      await apiRequest(`/workouts/${workout.id}`, { method: 'DELETE' })
      await load()
      toast('Planned workout removed.')
    } catch (issue) { toast(issue.message || 'Workout could not be removed.', 'error') }
  }

  const moveExercise = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= draft.exercises.length) return
    const ordered = [...draft.exercises]
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    setDraft({ ...draft, exercises: ordered })
  }

  if (!templates && !error) return <div className="space-y-5"><PageHeader eyebrow="Workout planner" title="Plan your training" /><Skeleton className="h-56" /><Skeleton className="h-40" /></div>
  if (error && !templates) return <Empty title="Planner unavailable" text={error} action={<Button onClick={load}>Try again</Button>} />

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Workout planner" title="Plan your training" sub="Templates are reusable; scheduled workouts are separate saved sessions." >
        <Button onClick={openNew}><Plus size={16} />New template</Button>
      </PageHeader>

      {draft && <Card className="space-y-5 !border-brand/40">
        <div className="flex items-center justify-between"><h2 className="font-bold text-xl">{draft.id ? 'Edit template' : 'Create workout template'}</h2><button aria-label="Close editor" onClick={() => setDraft(null)} className="p-2 text-mute"><X size={20} /></button></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Template name"><input className="input" maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
          <Field label="Fitness goal"><input className="input" maxLength={100} value={draft.goal} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} /></Field>
          <Field label="Experience"><select className="input" value={draft.experienceLevel} onChange={(event) => setDraft({ ...draft, experienceLevel: event.target.value })}>{['Beginner', 'Intermediate', 'Advanced'].map((level) => <option key={level}>{level}</option>)}</select></Field>
        </div>
        <div><p className="text-xs text-mute mb-2">Preferred training days</p><div className="flex flex-wrap gap-2">{WEEKDAYS.map((day) => <Chip key={day} active={draft.trainingDays.includes(day)} onClick={() => setDraft({ ...draft, trainingDays: draft.trainingDays.includes(day) ? draft.trainingDays.filter((item) => item !== day) : [...draft.trainingDays, day] })}>{day}</Chip>)}</div></div>
        <div className="space-y-3">
          {draft.exercises.map((item, index) => <div key={item.id || item.exerciseId} className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_90px_110px_100px_72px] gap-2 items-end rounded-xl bg-bg/50 p-3">
            <p className="col-span-2 sm:col-span-1 text-sm font-medium truncate pb-3">{item.name}</p>
            <Field label="Sets"><input className="input" type="number" min="1" max="20" value={item.sets} onChange={(event) => setDraft({ ...draft, exercises: draft.exercises.map((value, i) => i === index ? { ...value, sets: event.target.value } : value) })} /></Field>
            <Field label="Reps"><input className="input" maxLength="30" value={item.reps} onChange={(event) => setDraft({ ...draft, exercises: draft.exercises.map((value, i) => i === index ? { ...value, reps: event.target.value } : value) })} /></Field>
            <Field label="Rest (sec)"><input className="input" type="number" min="0" max="900" value={item.restSeconds} onChange={(event) => setDraft({ ...draft, exercises: draft.exercises.map((value, i) => i === index ? { ...value, restSeconds: event.target.value } : value) })} /></Field>
            <div className="mb-1 flex"><button aria-label={`Move ${item.name} up`} disabled={index === 0} onClick={() => moveExercise(index, -1)} className="p-2 text-mute disabled:opacity-30"><ChevronUp size={16} /></button><button aria-label={`Move ${item.name} down`} disabled={index === draft.exercises.length - 1} onClick={() => moveExercise(index, 1)} className="p-2 text-mute disabled:opacity-30"><ChevronDown size={16} /></button><button aria-label={`Remove ${item.name}`} onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((_, i) => i !== index) })} className="p-2 text-red-400"><Trash2 size={16} /></button></div>
          </div>)}
          <div className="flex gap-2"><select className="input" aria-label="Choose exercise to add" value="" onChange={(event) => addExercise(event.target.value)}><option value="">Add an exercise…</option>{exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></div>
        </div>
        <div className="flex gap-3"><Button disabled={saving} onClick={save}><Save size={16} />{saving ? 'Saving…' : 'Save template'}</Button><Button variant="plain" onClick={() => setDraft(null)}>Cancel</Button></div>
      </Card>}

      <section><h2 className="font-bold text-xl mb-4">Reusable templates</h2>
        {templates.length ? <div className="grid lg:grid-cols-2 gap-4">{templates.map((template) => <Card key={template.id}>
          <div className="flex justify-between gap-3"><div><h3 className="font-bold text-lg">{template.name}</h3><p className="text-xs text-mute">{template.goal} · {template.experience_level}</p><p className="text-xs text-mute mt-1">{(template.training_days || []).join(' · ') || 'No preferred days'} · {template.exercises.length} exercises</p></div><div className="flex gap-1"><button aria-label={`Edit ${template.name}`} onClick={() => edit(template)} className="p-2 text-mute hover:text-ink"><Pencil size={16} /></button><button aria-label={`Duplicate ${template.name}`} onClick={() => duplicate(template)} className="p-2 text-mute hover:text-ink"><Copy size={16} /></button><button aria-label={`Delete ${template.name}`} onClick={() => remove(template)} className="p-2 text-mute hover:text-red-400"><Trash2 size={16} /></button></div></div>
          <ul className="mt-4 space-y-1.5">{template.exercises.map((item) => <li key={item.id} className="flex justify-between gap-2 text-sm"><span>{item.name}</span><span className="text-mute shrink-0">{item.sets} × {item.reps}</span></li>)}</ul>
          <div className="mt-5 flex flex-wrap items-end gap-2"><Field label="Schedule date"><input className="input" type="date" min={dateKey()} value={scheduleDates[template.id] || dateKey()} onChange={(event) => setScheduleDates({ ...scheduleDates, [template.id]: event.target.value })} /></Field><Button disabled={saving} onClick={() => schedule(template)}><CalendarDays size={16} />Schedule</Button></div>
        </Card>)}</div> : <Empty title="No workout templates yet" text="Create a reusable plan, then schedule a separate workout session from it." />}</section>

      <section><h2 className="font-bold text-xl mb-4">Scheduled and active workouts</h2>
        {sessions.length ? <div className="grid sm:grid-cols-2 gap-3">{sessions.map((workout) => <Card key={workout.id} className="flex items-center justify-between gap-3 !p-4"><div><p className="font-semibold">{workout.name}</p><p className="text-xs text-mute">{workout.workout_date} · {workout.status.replace('_', ' ')}</p></div><div className="flex gap-2"><Link aria-label={`${workout.status === 'in_progress' ? 'Resume' : 'Start'} ${workout.name}`} to={`/app/workout?workout=${workout.id}`} className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-[#101B2A]"><Play size={15} />{workout.status === 'in_progress' ? 'Resume' : 'Start'}</Link>{workout.status === 'planned' && <button aria-label={`Delete ${workout.name}`} onClick={() => removeScheduledWorkout(workout)} className="p-2 text-red-400"><Trash2 size={17} /></button>}</div></Card>)}</div> : <Empty title="No scheduled workouts" text="Schedule a template above and it will appear here." />}
      </section>
    </div>
  )
}
