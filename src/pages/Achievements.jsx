import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, Trophy } from 'lucide-react'
import { Bar, Card, Empty, PageHeader, Skeleton } from '../components/ui'
import { apiRequest } from '../utils/api'

export default function Achievements() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const load = () => {
    setError('')
    return apiRequest('/achievements')
      .then(setItems)
      .catch((issue) => setError(issue.message || 'Achievements are unavailable.'))
  }
  useEffect(() => { load() }, [])

  if (!items && !error) return <div className="space-y-5"><PageHeader eyebrow="Achievements" title="Earn your badges" /><Skeleton className="h-52" /><Skeleton className="h-80" /></div>
  if (error) return <Empty icon={Trophy} title="Achievements unavailable" text={error} action={<button onClick={load} className="text-brand font-semibold">Try again</button>} />

  const unlocked = items.filter((item) => item.unlocked_at).length
  const workoutCount = Math.max(0, ...items.filter((item) => item.criterion === 'workouts').map((item) => item.progress))
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Achievements" title="Earn your badges" sub="Awards are unlocked from completed workouts and recorded milestones." />
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-gold/15 text-gold flex items-center justify-center"><Trophy size={26} /></div><div><p className="font-display text-3xl font-bold">{unlocked}/{items.length}</p><p className="text-sm text-mute">Achievements unlocked</p></div></Card>
        <Card><p className="text-sm text-mute">Recorded completed workouts</p><p className="font-display text-3xl font-bold mt-1">{workoutCount}</p></Card>
      </div>
      {items.length ? <section><h2 className="font-bold text-xl mb-4">Milestones</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const isUnlocked = Boolean(item.unlocked_at)
          return <Card key={item.id} className={`relative overflow-hidden ${isUnlocked ? '!border-gold/50' : ''}`}>
            <div className="flex items-start gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isUnlocked ? 'bg-gold/20 text-gold' : 'bg-ink/10 text-mute'}`}>{isUnlocked ? <CheckCircle2 size={22} /> : <Lock size={20} />}</div><div className="min-w-0"><h3 className="font-bold">{item.title}</h3><p className="text-xs text-mute mt-1">{item.description}</p></div></div>
            <div className="mt-4"><Bar value={item.progress} max={item.threshold} color={isUnlocked ? 'bg-gold' : 'bg-brand'} /><p className="flex justify-between text-xs text-mute mt-2"><span>{Math.min(item.progress, item.threshold)} / {item.threshold}</span><span>{isUnlocked ? `Unlocked ${new Date(item.unlocked_at).toLocaleDateString()}` : 'In progress'}</span></p></div>
          </Card>
        })}
      </div></section> : <Empty icon={Trophy} title="No achievements yet" text="Complete a workout or record a personal best to get started." />}
    </div>
  )
}
