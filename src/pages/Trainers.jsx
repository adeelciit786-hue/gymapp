import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Users } from 'lucide-react'
import { Button, Card, Empty, PageHeader, Skeleton } from '../components/ui'
import { apiRequest } from '../utils/api'

export default function Trainers() {
  const [classes, setClasses] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    apiRequest('/classes')
      .then(setClasses)
      .catch((issue) => setError(issue.message || 'Coach schedules could not be loaded.'))
  }, [])

  const coaches = useMemo(() => {
    if (!classes) return []
    const grouped = new Map()
    for (const session of classes) {
      const current = grouped.get(session.coach_name) || []
      current.push(session)
      grouped.set(session.coach_name, current)
    }
    return [...grouped.entries()].map(([name, sessions]) => ({ name, sessions }))
  }, [classes])

  if (!classes && !error) return <div className="space-y-5"><PageHeader eyebrow="Coaches" title="Meet the class coaches" /><Skeleton className="h-52" /></div>
  if (error) return <Empty icon={Users} title="Coach schedules unavailable" text={error} action={<Button onClick={() => window.location.reload()}>Try again</Button>} />

  return <div className="space-y-6">
    <PageHeader eyebrow="Coaches" title="Meet the class coaches" sub="Coach names and upcoming sessions are loaded from the gym class schedule." />
    {coaches.length ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{coaches.map(({ name, sessions }) => <Card key={name}>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand to-gold text-[#101B2A] font-display text-xl font-bold flex items-center justify-center">{name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
      <h2 className="font-bold text-xl mt-4">{name}</h2>
      <p className="text-sm text-mute mt-1">{sessions.length} scheduled class{sessions.length === 1 ? '' : 'es'}</p>
      <ul className="mt-4 space-y-3">{sessions.slice(0, 3).map((session) => <li key={session.id} className="rounded-xl bg-bg/50 p-3"><p className="font-semibold text-sm">{session.title}</p><p className="text-xs text-mute mt-1 flex items-center gap-1"><CalendarDays size={13} />{new Date(session.start_time).toLocaleString()}</p></li>)}</ul>
      <Button as={Link} to="/app/classes" variant="soft" className="mt-4 w-full">Browse and book classes</Button>
    </Card>)}</div> : <Empty icon={Users} title="No upcoming coach-led classes" text="Check the class schedule later for upcoming sessions." action={<Button as={Link} to="/app/classes">View classes</Button>} />}
    <p className="text-xs text-mute">Coach profiles, biographies, and private consultation bookings are not represented in this schedule view.</p>
  </div>
}
