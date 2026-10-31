import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, Clock3, Dumbbell, Flame, Play, Target } from 'lucide-react'
import { Bar, Button, Card, Empty, PageHeader, Ring, Skeleton, Stat } from '../components/ui'
import { useAuth } from '../context/auth'
import { apiRequest } from '../utils/api'

function dayName(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/dashboard')
      .then((result) => { if (active) setData(result) })
      .catch((issue) => { if (active) setError(issue.message || 'Dashboard data is unavailable.') })
    return () => { active = false }
  }, [])

  const streak = useMemo(() => {
    if (!data?.streakDates) return 0
    const completedDates = new Set(data.streakDates)
    let cursor = new Date(`${data.today}T00:00:00Z`)
    if (!completedDates.has(data.today)) cursor.setUTCDate(cursor.getUTCDate() - 1)
    let total = 0
    while (completedDates.has(cursor.toISOString().slice(0, 10))) {
      total += 1
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
    return total
  }, [data])

  if (!data && !error) return (
    <div className="space-y-5" aria-label="Loading dashboard">
      <Skeleton className="h-28" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-28" />)}</div>
      <div className="grid lg:grid-cols-3 gap-5"><Skeleton className="h-64 lg:col-span-2" /><Skeleton className="h-64" /></div>
    </div>
  )

  if (error) return <Empty title="Dashboard unavailable" text={error} action={<Button onClick={() => window.location.reload()}>Try again</Button>} />

  const workoutGoal = data.user.weekly_goal_workouts
  const minuteGoal = data.user.weekly_goal_minutes
  const workouts = data.summary.workouts_this_week
  const minutes = data.summary.active_minutes
  const workoutPct = workoutGoal ? Math.min(100, Math.round(workouts / workoutGoal * 100)) : 0
  const minutePct = minuteGoal ? Math.min(100, Math.round(minutes / minuteGoal * 100)) : 0
  const goalsHit = Number(workouts >= workoutGoal) + Number(minutes >= minuteGoal)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const greet = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-9 bg-gradient-to-br from-card via-bg2 to-bg border border-ink/10">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-brand/25 blur-[90px]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="eyebrow mb-2">{today}</p>
            <h1 className="h-display text-3xl sm:text-5xl">{greet}, {(user?.fullName || data.user.full_name).split(' ')[0].replace(/[.,]+$/, '')}.</h1>
            <p className="text-mute mt-3 max-w-lg text-sm">Your progress, grounded in your training history.</p>
          </div>
          <Button as={Link} to={data.todayWorkout ? `/app/workout?workout=${data.todayWorkout.id}` : '/app/library'} size="lg">
            <Play size={18} fill="currentColor" />{data.todayWorkout?.status === 'in_progress' ? 'Resume workout' : data.todayWorkout ? 'Start workout' : 'Build today’s workout'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={Dumbbell} label="Workouts" value={`${workouts}/${workoutGoal}`} sub="this week" />
        <Stat icon={Clock3} label="Active time" value={`${minutes}m`} sub={`of ${minuteGoal} min goal`} accent="text-gold" />
        <Stat icon={Flame} label="Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} sub="database calendar" />
        <Stat icon={Target} label="Goals hit" value={`${goalsHit}/2`} sub="weekly targets" accent="text-gold" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-ink/10">
            <p className="eyebrow mb-1">Today's workout</p>
            <h2 className="text-xl sm:text-2xl font-bold">{data.todayWorkout?.name || 'No workout planned'}</h2>
          </div>
          {data.todayWorkout ? (
            <div className="p-5 sm:p-6">
              <p className="text-sm text-mute">{data.todayWorkout.exercise_count} exercises · {data.todayWorkout.status.replace('_', ' ')}</p>
              <Button as={Link} to={`/app/workout?workout=${data.todayWorkout.id}`} className="mt-4"><Play size={16} fill="currentColor" />{data.todayWorkout.status === 'in_progress' ? 'Resume session' : 'Start session'}</Button>
            </div>
          ) : (
            <div className="p-5 sm:p-6"><Empty title="No workout planned for today." text="Explore the Library and build your session." action={<Button as={Link} to="/app/library">Explore library</Button>} /></div>
          )}
        </Card>

        <Card className="flex flex-col items-center justify-center text-center">
          <p className="eyebrow mb-4">Workout goal</p>
          <Ring value={workoutPct} size={160} stroke={13}>
            <span className="font-display text-4xl font-bold">{workoutPct}%</span>
            <span className="text-xs text-mute">{workouts} of {workoutGoal} workouts</span>
          </Ring>
          <div className="w-full mt-5 text-left">
            <div className="flex justify-between text-xs mb-2"><span>Active minutes</span><span className="text-mute">{minutes}/{minuteGoal}</span></div>
            <Bar value={minutes} max={minuteGoal || 1} />
          </div>
        </Card>
      </div>

      {data.scheduledWorkouts?.length > 0 && <Card>
        <div className="flex items-center justify-between gap-3 mb-4"><h2 className="font-bold text-lg">Upcoming planned workouts</h2><Link to="/app/planner" className="text-xs text-brand font-semibold">Open planner</Link></div>
        <ul className="grid sm:grid-cols-2 gap-3">{data.scheduledWorkouts.map((workout) => <li key={workout.id} className="flex items-center justify-between gap-3 rounded-xl bg-bg/50 p-3">
          <div className="min-w-0"><p className="font-semibold text-sm truncate">{workout.name}</p><p className="text-xs text-mute">{new Date(`${workout.workout_date}T12:00:00`).toLocaleDateString()}</p></div>
          <Button as={Link} to={`/app/workout?workout=${workout.id}`} size="sm"><Play size={14} />Start</Button>
        </li>)}</ul>
      </Card>}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Seven-day activity</h2><span className="text-xs text-mute">minutes / day</span></div>
          <div className="grid grid-cols-7 gap-2 items-end h-40">
            {data.dailyActivity.map((day) => {
              const max = Math.max(1, ...data.dailyActivity.map((item) => item.minutes))
              return <div key={day.date} className="h-full flex flex-col justify-end items-center gap-2 min-w-0">
                <span className="text-[10px] text-mute">{day.minutes || ''}</span>
                <div className="w-full rounded-t-md bg-brand/80 min-h-1" style={{ height: `${Math.max(3, day.minutes / max * 100)}%` }} />
                <span className="text-[10px] text-mute">{dayName(day.date)}</span>
              </div>
            })}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Recent activity</h2><Link to="/app/profile" className="text-xs text-brand font-semibold">Profile</Link></div>
          {data.recentWorkouts.length ? <ul className="space-y-2">{data.recentWorkouts.map((workout) => (
            <li key={workout.id} className="flex items-center gap-3 rounded-xl bg-bg/50 p-3">
              <CheckCircle2 className="text-brand shrink-0" size={18} />
              <div className="min-w-0 flex-1"><p className="font-semibold text-sm truncate">{workout.name}</p><p className="text-xs text-mute">{new Date(`${workout.workout_date}T12:00:00`).toLocaleDateString()}</p></div>
              <span className="text-xs text-mute">{workout.duration_minutes ?? 0} min</span>
            </li>
          ))}</ul> : <Empty title="No completed workouts yet." text="Your first session starts here." />}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Upcoming booked classes</h2><Link to="/app/classes" className="text-xs text-brand font-semibold">Browse classes</Link></div>
        {data.upcomingClasses.length ? <ul className="grid md:grid-cols-2 gap-3">{data.upcomingClasses.map((item) => (
          <li key={item.id} className="flex gap-3 rounded-xl bg-bg/50 p-3"><CalendarDays className="text-brand mt-0.5" size={19} /><div><p className="font-semibold text-sm">{item.title}</p><p className="text-xs text-mute">{item.coach_name} · {new Date(item.start_time).toLocaleString()}</p></div></li>
        ))}</ul> : <Empty title="No upcoming classes booked." text="Reserve a place in a class to see it here." action={<Button as={Link} to="/app/classes">View classes</Button>} />}
      </Card>
    </div>
  )
}
