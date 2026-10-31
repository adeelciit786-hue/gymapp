import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, History, Pencil, Sun, Moon } from 'lucide-react'
import { Button, Card, Chip, Empty, PageHeader, Skeleton } from '../components/ui'
import { useStore } from '../context/store'
import { useToast } from '../context/toast'
import { GOALS, LEVELS } from '../data/plans'
import { WEEKDAYS } from '../utils/stats'
import { apiRequest } from '../utils/api'
import { useAuth } from '../context/auth'

const initialForm = { fullName: '', weeklyGoalWorkouts: 3, weeklyGoalMinutes: 150, fitnessGoal: 'General Fitness', experienceLevel: 'Beginner', preferredTrainingDays: [] }

export default function Profile() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const { updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [history, setHistory] = useState([])
  const [bookings, setBookings] = useState([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([apiRequest('/profile'), apiRequest('/workout-history?limit=10'), apiRequest('/class-bookings')])
      .then(([member, workouts, classes]) => {
        if (!active) return
        setProfile(member)
        setForm({
          fullName: member.full_name,
          weeklyGoalWorkouts: member.weekly_goal_workouts,
          weeklyGoalMinutes: member.weekly_goal_minutes,
          fitnessGoal: member.fitness_goal,
          experienceLevel: member.experience_level,
          preferredTrainingDays: member.preferred_training_days,
        })
        setHistory(workouts)
        setBookings(classes.filter((item) => item.booking_status === 'booked' && new Date(item.start_time) > new Date()))
      })
      .catch((issue) => { if (active) setError(issue.message || 'Profile data is unavailable.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const updated = await apiRequest('/profile', { method: 'PUT', body: JSON.stringify(form) })
      setProfile(updated)
      updateUser({
        fullName: updated.full_name,
        email: updated.email,
        weeklyGoalWorkouts: updated.weekly_goal_workouts,
        weeklyGoalMinutes: updated.weekly_goal_minutes,
      })
      setEditing(false)
      toast('Profile updated')
    } catch (issue) { toast(issue.message || 'Profile could not be saved.', 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="space-y-5"><Skeleton className="h-14 w-2/3" /><Skeleton className="h-44" /><Skeleton className="h-56" /></div>
  if (error || !profile) return <Empty title="Profile unavailable" text={error} action={<Button onClick={() => window.location.reload()}>Try again</Button>} />

  const initials = profile.full_name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
  const updateDay = (day) => setForm((current) => ({
    ...current,
    preferredTrainingDays: current.preferredTrainingDays.includes(day)
      ? current.preferredTrainingDays.filter((item) => item !== day)
      : [...current.preferredTrainingDays, day],
  }))

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Member profile" title="Your profile"><Button onClick={() => setEditing((current) => !current)}><Pencil size={16} />{editing ? 'Cancel edit' : 'Edit profile'}</Button></PageHeader>
      <Card className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand to-gold text-[#101B2A] font-display text-3xl font-bold flex items-center justify-center shrink-0">{initials}</div>
        <div className="min-w-0 flex-1 text-center sm:text-left"><h2 className="font-display text-3xl font-bold break-words">{profile.full_name}</h2><p className="text-sm text-mute mt-1">{profile.email}</p>
          <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start text-xs"><span className="rounded-full bg-brand/15 text-brand px-3 py-1.5 font-semibold">{profile.fitness_goal}</span><span className="rounded-full bg-ink/10 px-3 py-1.5">{profile.experience_level}</span><span className="rounded-full bg-ink/10 px-3 py-1.5">{profile.weekly_goal_workouts} workouts / week</span><span className="rounded-full bg-ink/10 px-3 py-1.5">{profile.weekly_goal_minutes} min / week</span></div>
        </div>
      </Card>

      {editing && <Card><h2 className="font-bold text-lg mb-4">Member details</h2>
        <form onSubmit={save} className="space-y-5">
          <label className="block text-sm font-medium">Full name<input className="input mt-1.5" required minLength={2} maxLength={100} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Weekly workout goal<input className="input mt-1.5" type="number" min={1} max={7} required value={form.weeklyGoalWorkouts} onChange={(event) => setForm({ ...form, weeklyGoalWorkouts: Number(event.target.value) })} /></label>
            <label className="block text-sm font-medium">Weekly active minutes<input className="input mt-1.5" type="number" min={1} max={2000} required value={form.weeklyGoalMinutes} onChange={(event) => setForm({ ...form, weeklyGoalMinutes: Number(event.target.value) })} /></label>
          </div>
          <div><p className="text-xs font-medium text-mute mb-2">Fitness goal</p><div className="flex flex-wrap gap-2">{GOALS.map((goal) => <Chip key={goal} active={form.fitnessGoal === goal} onClick={() => setForm({ ...form, fitnessGoal: goal })}>{goal}</Chip>)}</div></div>
          <div><p className="text-xs font-medium text-mute mb-2">Training experience</p><div className="flex flex-wrap gap-2">{LEVELS.map((level) => <Chip key={level} active={form.experienceLevel === level} onClick={() => setForm({ ...form, experienceLevel: level })}>{level}</Chip>)}</div></div>
          <div><p className="text-xs font-medium text-mute mb-2">Preferred training days</p><div className="flex flex-wrap gap-2">{WEEKDAYS.map((day) => <Chip key={day} active={form.preferredTrainingDays.includes(day)} onClick={() => updateDay(day)}>{day}</Chip>)}</div></div>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
        </form>
      </Card>}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card><h2 className="font-bold mb-4 flex items-center gap-2"><History size={18} className="text-brand" />Workout history</h2>
          {history.length ? <ul className="space-y-2 max-h-80 overflow-y-auto">{history.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-bg/50 px-3 py-2.5"><div className="min-w-0"><p className="text-sm font-medium truncate">{item.name}</p><p className="text-xs text-mute">{new Date(`${item.workout_date}T12:00:00`).toLocaleDateString()}</p></div><div className="text-right text-xs text-mute shrink-0"><p>{item.duration_minutes ?? 0} min</p><p>{item.completed_sets} sets · {item.exercise_count} exercises</p></div></li>)}</ul> : <Empty title="No completed workouts yet." text="Your sessions will appear here." />}</Card>
        <Card><h2 className="font-bold mb-4 flex items-center gap-2"><CalendarDays size={18} className="text-brand" />Upcoming classes</h2>
          {bookings.length ? <ul className="space-y-2">{bookings.map((item) => <li key={item.booking_id} className="rounded-xl bg-bg/50 p-3"><p className="font-semibold text-sm">{item.title}</p><p className="text-xs text-mute">{new Date(item.start_time).toLocaleString()}</p></li>)}</ul> : <p className="text-sm text-mute">No upcoming classes booked. <Link to="/app/classes" className="text-brand">Browse classes</Link></p>}</Card>
      </div>
      <Card className="flex items-center justify-between"><div><h2 className="font-bold">Theme</h2><p className="text-xs text-mute">Your preference remains on this device.</p></div><div className="flex gap-2"><Chip active={state.settings.theme === 'dark'} onClick={() => dispatch({ type: 'theme', v: 'dark' })}><Moon size={14} className="inline mr-1" />Dark</Chip><Chip active={state.settings.theme === 'light'} onClick={() => dispatch({ type: 'theme', v: 'light' })}><Sun size={14} className="inline mr-1" />Light</Chip></div></Card>
    </div>
  )
}
