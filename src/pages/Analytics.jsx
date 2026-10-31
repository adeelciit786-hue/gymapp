import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Dumbbell, Timer, Flame, Weight, LineChart as ChartIcon } from 'lucide-react'
import { Button, Card, Empty, PageHeader, Stat, axis, chartTip } from '../components/ui'
import { apiRequest } from '../utils/api'

const COLORS = ['#FF7049', '#E8B86D', '#5BA4CF', '#8B7BD8', '#4FB99F', '#E06C9F']
const periods = [7, 30, 90]
const dateLabel = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function Analytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [nutrition, setNutrition] = useState([])
  const [error, setError] = useState('')
  const load = async (windowDays = days) => {
    setError('')
    try {
      const [workoutData, nutritionData] = await Promise.all([
        apiRequest(`/analytics?days=${windowDays}`),
        apiRequest(`/nutrition/history?days=${windowDays}`),
      ])
      setData(workoutData)
      setNutrition(nutritionData)
    } catch (issue) { setError(issue.message || 'Analytics could not be loaded.') }
  }
  useEffect(() => { load(days) }, [days])

  if (error) return <div><PageHeader eyebrow="Progress" title="Your analytics" /><Empty icon={ChartIcon} title="Analytics unavailable" text={error} action={<Button onClick={() => load(days)}>Try again</Button>} /></div>
  if (!data) return <div className="space-y-5"><PageHeader eyebrow="Progress" title="Your analytics" /><Card className="h-52 animate-pulse" /><Card className="h-64 animate-pulse" /></div>

  const minutes = Number(data.totals.minutes)
  const average = Number(data.totals.average_minutes)
  const totalVolume = data.volume.reduce((sum, item) => sum + Number(item.volume), 0)
  const workoutDays = new Map(data.workouts.map((item) => [item.date, item]))
  const workouts = data.workouts.map((item) => ({ ...item, label: dateLabel(item.date) }))
  const volumes = data.volume.map((item) => ({ ...item, volume: Number(item.volume), label: dateLabel(item.date) }))
  const foodDays = nutrition.map((item) => ({ ...item, calories: Number(item.calories), label: dateLabel(item.date) }))
  const activeDays = workoutDays.size

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Progress & analytics" title="Your performance" sub="Every chart is calculated from your recorded activity. Missing logs are not estimated.">
        <div className="flex gap-2 glass p-1.5 rounded-full">{periods.map((period) => <button key={period} onClick={() => setDays(period)} aria-pressed={days === period} className={`rounded-full px-3 py-2 text-xs font-semibold ${days === period ? 'bg-brand text-[#101B2A]' : 'text-mute'}`}>{period} Days</button>)}</div>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={Dumbbell} label="Workouts" value={data.totals.workouts} sub={`last ${days} days`} />
        <Stat icon={Timer} label="Active time" value={`${minutes}m`} sub={`${average} min average`} accent="text-gold" />
        <Stat icon={Weight} label="Recorded volume" value={`${(totalVolume / 1000).toFixed(1)}t`} sub={`${Math.round(totalVolume).toLocaleString()} kg × reps`} />
        <Stat icon={Flame} label="Consistency" value={`${activeDays}/${days}`} sub="days with completed training" accent="text-gold" />
      </div>
      {Number(data.totals.workouts) === 0 && <Empty icon={Dumbbell} title="No completed workouts in this period" text="Finish a workout to see your training trends here." />}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card><h2 className="font-bold mb-1">Workout frequency</h2><p className="text-xs text-mute mb-4">Completed sessions by day</p><div className="h-60 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={workouts} margin={{ left: -24, right: 4 }}><CartesianGrid vertical={false} stroke="rgb(var(--ink) / .07)" /><XAxis dataKey="label" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...chartTip} /><Bar dataKey="workouts" name="Workouts" fill="rgb(var(--brand))" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><h2 className="font-bold mb-1">Recorded training volume</h2><p className="text-xs text-mute mb-4">Completed sets with both weight and reps entered (kg × reps)</p>{volumes.length ? <div className="h-60 min-w-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={volumes} margin={{ left: -14, right: 4 }}><CartesianGrid vertical={false} stroke="rgb(var(--ink) / .07)" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} /><Tooltip {...chartTip} /><Area type="monotone" dataKey="volume" name="Volume" stroke="#FF7049" fill="#FF7049" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></div> : <p className="text-sm text-mute py-16 text-center">No weighted completed sets in this period.</p>}</Card>
        <Card><h2 className="font-bold mb-1">Muscle-group distribution</h2><p className="text-xs text-mute mb-2">Recorded completed sets</p>{data.muscleGroups.length ? <div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.muscleGroups} dataKey="sets" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={3}>{data.muscleGroups.map((group, index) => <Cell key={group.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip {...chartTip} /></PieChart></ResponsiveContainer></div> : <p className="text-sm text-mute py-16 text-center">No completed sets recorded in this period.</p>}</Card>
        <Card><h2 className="font-bold mb-1">Nutrition log trend</h2><p className="text-xs text-mute mb-4">Calories from food entries only; unlogged days are zero, not estimates.</p><div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={foodDays} margin={{ left: -14, right: 4 }}><CartesianGrid vertical={false} stroke="rgb(var(--ink) / .07)" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} /><Tooltip {...chartTip} /><Area type="monotone" dataKey="calories" name="Logged kcal" stroke="#E8B86D" fill="#E8B86D" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></div></Card>
      </div>
    </div>
  )
}
