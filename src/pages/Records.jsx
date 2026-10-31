import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { Button, Card, Empty, PageHeader, Skeleton } from '../components/ui'
import { apiRequest } from '../utils/api'

export default function Records() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/personal-records')
      .then((rows) => { if (active) setRecords(rows) })
      .catch((issue) => { if (active) setError(issue.message || 'Personal records are unavailable.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) return <div className="space-y-5"><Skeleton className="h-14 w-2/3" /><Skeleton className="h-56" /></div>
  if (error) return <Empty title="Personal records unavailable" text={error} action={<Button onClick={() => window.location.reload()}>Try again</Button>} />

  return <div className="space-y-6">
    <PageHeader eyebrow="Training milestones" title="Personal records" sub="Records are based only on completed sets with actual performance inputs." />
    {records.length ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{records.map((record) => (
      <Card key={`${record.exercise_id}-${record.record_type}`} className="relative overflow-hidden">
        <Trophy className="text-gold mb-4" size={22} />
        <p className="text-xs uppercase tracking-wider text-mute">{record.record_type}</p>
        <h2 className="font-bold mt-1">{record.exercise_name}</h2>
        <p className="font-display text-4xl font-bold text-brand mt-3">{Number(record.record_value).toLocaleString()} <span className="text-base text-mute">{record.record_unit}</span></p>
      </Card>
    ))}</div> : <Empty icon={Trophy} title="No personal records yet." text="Complete sets with recorded reps or weight to build your real progress history." />}
  </div>
}
