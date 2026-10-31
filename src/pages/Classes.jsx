import { useEffect, useMemo, useState } from 'react'
import { CalendarX, Clock, Gauge, Ticket, User } from 'lucide-react'
import { Button, Card, Chip, Empty, PageHeader, Skeleton } from '../components/ui'
import { useToast } from '../context/toast'
import { apiRequest } from '../utils/api'

const INTENSITY = { Easy: 'text-emerald-400 bg-emerald-400/10', Medium: 'text-gold bg-gold/10', Hard: 'text-red-400 bg-red-400/10' }
const dateKey = (date) => new Date(date).toISOString().slice(0, 10)

export default function Classes() {
  const toast = useToast()
  const [classes, setClasses] = useState([])
  const [bookings, setBookings] = useState([])
  const [day, setDay] = useState('')
  const [type, setType] = useState('All')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')

  const refresh = async () => {
    const [available, currentBookings] = await Promise.all([apiRequest('/classes'), apiRequest('/class-bookings')])
    setClasses(available)
    setBookings(currentBookings.filter((booking) => booking.booking_status === 'booked'))
  }

  useEffect(() => {
    let active = true
    Promise.all([apiRequest('/classes'), apiRequest('/class-bookings')])
      .then(([available, currentBookings]) => {
        if (!active) return
        setClasses(available)
        setBookings(currentBookings.filter((booking) => booking.booking_status === 'booked'))
      })
      .catch((issue) => { if (active) setError(issue.message || 'Class timetable is unavailable.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const days = useMemo(() => [...new Set(classes.map((item) => dateKey(item.start_time)))], [classes])
  const types = useMemo(() => [...new Set(classes.map((item) => item.title))], [classes])
  useEffect(() => { if (!day && days.length) setDay(days[0]) }, [days, day])
  const bookedIds = new Set(bookings.map((item) => item.class_id))
  const list = classes.filter((item) => (!day || dateKey(item.start_time) === day) && (type === 'All' || item.title === type))
  const mine = bookings.filter((booking) => new Date(booking.start_time) > new Date())

  const book = async (item) => {
    if (working) return
    setWorking(item.id)
    try {
      await apiRequest('/class-bookings', { method: 'POST', body: JSON.stringify({ classId: item.id }) })
      await refresh()
      toast(`Booked ${item.title}`)
    } catch (issue) { toast(issue.message || 'This class could not be booked.', 'error') }
    finally { setWorking('') }
  }

  const cancel = async (booking) => {
    if (working) return
    setWorking(booking.booking_id)
    try {
      await apiRequest(`/class-bookings/${booking.booking_id}`, { method: 'DELETE' })
      await refresh()
      toast('Class booking cancelled')
    } catch (issue) { toast(issue.message || 'Booking could not be cancelled.', 'error') }
    finally { setWorking('') }
  }

  if (loading) return <div className="space-y-5"><Skeleton className="h-14 w-2/3" /><Skeleton className="h-12" /><Skeleton className="h-64" /></div>
  if (error) return <Empty title="Classes unavailable" text={error} action={<Button onClick={() => window.location.reload()}>Try again</Button>} />

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Group classes" title="This week's timetable" sub="Browse real upcoming classes and reserve a place." />
      {days.length > 0 && <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">{days.map((value) => {
        const date = new Date(`${value}T12:00:00`)
        return <button key={value} onClick={() => setDay(value)} aria-pressed={day === value} className={`shrink-0 w-[68px] py-3 rounded-2xl text-center border transition ${day === value ? 'bg-brand text-[#101B2A] border-brand shadow-glow' : 'surface hover:border-brand/40'}`}>
          <span className="block text-[11px] uppercase font-semibold opacity-80">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span><span className="block font-display text-2xl font-bold">{date.getDate()}</span>
        </button>
      })}</div>}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">{['All', ...types].map((value) => <Chip key={value} active={type === value} onClick={() => setType(value)}>{value}</Chip>)}</div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {list.length === 0 ? <Empty icon={CalendarX} title="No upcoming classes match" text="Try another class type or check back later." /> : list.map((item) => {
            const booking = bookings.find((current) => current.class_id === item.id)
            const start = new Date(item.start_time)
            return <Card key={item.id} hover className={`flex flex-col sm:flex-row sm:items-center gap-4 ${booking ? '!border-brand/60' : ''}`}>
              <div className="sm:w-32 shrink-0"><p className="font-display text-xl font-bold">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p><p className="text-xs text-mute flex items-center gap-1"><Clock size={12} />{item.duration_minutes} min</p></div>
              <div className="flex-1 min-w-0"><h3 className="font-bold text-lg leading-tight">{item.title}</h3><p className="text-sm text-mute flex items-center gap-1.5 mt-1"><User size={14} />{item.coach_name}</p>
                <p className="text-xs text-mute mt-2">{item.description}</p>
                <div className="flex flex-wrap gap-2 mt-3 text-xs"><span className={`rounded-full px-2.5 py-1 font-semibold flex items-center gap-1 ${INTENSITY[item.intensity]}`}><Gauge size={12} />{item.intensity}</span><span className={`rounded-full px-2.5 py-1 font-semibold ${item.spots_remaining <= 0 ? 'bg-red-400/10 text-red-400' : item.spots_remaining <= 4 ? 'bg-gold/10 text-gold' : 'bg-ink/10 text-mute'}`}>{item.spots_remaining <= 0 ? 'Full' : `${item.spots_remaining} spots left`}</span></div></div>
              {booking ? <Button variant="danger" size="sm" disabled={working === booking.booking_id} onClick={() => cancel(booking)}>{working === booking.booking_id ? 'Saving…' : 'Cancel booking'}</Button> : <Button size="sm" disabled={working === item.id || item.spots_remaining <= 0} onClick={() => book(item)}>{working === item.id ? 'Booking…' : item.spots_remaining <= 0 ? 'Full' : 'Book'}</Button>}
            </Card>
          })}
        </div>
        <Card className="h-fit lg:sticky lg:top-6"><h2 className="font-bold mb-4 flex items-center gap-2"><Ticket size={18} className="text-brand" />My bookings</h2>
          {mine.length ? <ul className="space-y-2">{mine.map((booking) => <li key={booking.booking_id} className="rounded-xl bg-bg/50 p-3"><p className="font-semibold text-sm">{booking.title}</p><p className="text-xs text-mute">{new Date(booking.start_time).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p><button disabled={working === booking.booking_id} onClick={() => cancel(booking)} className="text-xs text-red-400 mt-1.5 font-medium py-1 disabled:opacity-40">Cancel</button></li>)}</ul> : <p className="text-sm text-mute">No upcoming classes booked.</p>}
        </Card>
      </div>
    </div>
  )
}
