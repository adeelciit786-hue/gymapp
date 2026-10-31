import { useEffect, useState } from 'react'
import { History as HistoryIcon, Search } from 'lucide-react'
import { Button, Card, Empty, PageHeader, Skeleton } from '../components/ui'
import { apiRequest } from '../utils/api'

const PAGE_SIZE = 20

export default function History() {
  const [items, setItems] = useState([])
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const query = new URLSearchParams({ limit: String(PAGE_SIZE + 1), offset: String(offset) })
    if (search.trim()) query.set('search', search.trim())
    if (from) query.set('from', from)
    if (to) query.set('to', to)
    const timer = setTimeout(() => {
      apiRequest(`/workout-history?${query}`)
        .then((rows) => {
          if (!active) return
          setHasMore(rows.length > PAGE_SIZE)
          setItems(rows.slice(0, PAGE_SIZE))
          setDetail(null)
        })
        .catch((issue) => { if (active) setError(issue.message || 'Workout history is unavailable.') })
        .finally(() => { if (active) setLoading(false) })
    }, search ? 250 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [search, from, to, offset])

  const openDetail = async (item) => {
    try { setDetail(await apiRequest(`/workouts?id=${encodeURIComponent(item.id)}`)) }
    catch (issue) { setError(issue.message || 'Workout details could not be loaded.') }
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Training log" title="Workout history" sub="Completed and in-progress sessions saved to your account." />
    <Card className="grid sm:grid-cols-3 gap-3">
      <label className="text-xs text-mute">Search workout type<div className="relative mt-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} /><input className="input !pl-9" value={search} onChange={(event) => { setOffset(0); setSearch(event.target.value) }} placeholder="Workout name" /></div></label>
      <label className="text-xs text-mute">From date<input className="input mt-1" type="date" value={from} onChange={(event) => { setOffset(0); setFrom(event.target.value) }} /></label>
      <label className="text-xs text-mute">To date<input className="input mt-1" type="date" value={to} onChange={(event) => { setOffset(0); setTo(event.target.value) }} /></label>
    </Card>
    {loading ? <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div> : error ? <Empty title="Workout history unavailable" text={error} action={<Button onClick={() => window.location.reload()}>Try again</Button>} /> : items.length ? <>
      <div className="space-y-3">{items.map((item) => <Card key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3">
        <HistoryIcon className="text-brand shrink-0" size={20} /><div className="flex-1 min-w-0"><h2 className="font-bold truncate">{item.name}</h2><p className="text-xs text-mute">{new Date(`${item.workout_date}T12:00:00`).toLocaleDateString()} · {item.exercise_count} exercises · {item.completed_sets} sets · {item.status.replace('_', ' ')}</p></div>
        <span className="text-sm text-mute">{item.duration_minutes ?? 0} min</span><Button variant="ghost" size="sm" onClick={() => openDetail(item)}>Details</Button>
      </Card>)}</div>
      <div className="flex justify-between"><Button variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button><Button variant="ghost" disabled={!hasMore} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</Button></div>
    </> : <Empty icon={HistoryIcon} title="No completed workouts yet." text="Your first session starts here." />}
    {detail && <Card><div className="flex items-start justify-between gap-3"><div><p className="eyebrow mb-1">Workout details</p><h2 className="font-bold text-lg">{detail.name}</h2></div><Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Close</Button></div>
      <ul className="mt-4 space-y-3">{detail.exercises.map((exercise) => <li key={exercise.id} className="rounded-xl bg-bg/50 p-3"><p className="font-semibold text-sm">{exercise.name}</p><p className="text-xs text-mute mt-1">{exercise.workoutSets.filter((item) => item.completed).length} of {exercise.workoutSets.length} sets completed</p></li>)}</ul>
    </Card>}
  </div>
}
