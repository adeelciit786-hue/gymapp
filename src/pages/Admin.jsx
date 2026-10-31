import { useEffect, useState } from 'react'
import { CalendarDays, ClipboardList, Search, ShieldCheck, Users } from 'lucide-react'
import { Button, Card, Empty, Field, PageHeader, Skeleton, Stat } from '../components/ui'
import { apiRequest } from '../utils/api'
import { useAuth } from '../context/auth'
import { useToast } from '../context/toast'

const EMPTY_CLASS = { title: '', coachName: '', startTime: '', durationMinutes: 45, capacity: 12, intensity: 'Medium', description: '' }

export default function Admin() {
  const { user } = useAuth()
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [members, setMembers] = useState([])
  const [classes, setClasses] = useState([])
  const [memberships, setMemberships] = useState([])
  const [exercises, setExercises] = useState([])
  const [audit, setAudit] = useState([])
  const [classBookings, setClassBookings] = useState({})
  const [search, setSearch] = useState('')
  const [classDraft, setClassDraft] = useState(EMPTY_CLASS)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (user?.role !== 'admin') {
      setError('Administrator access is required.')
      return
    }
    setError('')
    try {
      const [metrics, directory, scheduledClasses, inquiries, exerciseList, logs] = await Promise.all([
        apiRequest('/admin/summary'),
        apiRequest('/admin/members?limit=50'),
        apiRequest('/admin/classes'),
        apiRequest('/admin/memberships'),
        apiRequest('/admin/exercises'),
        apiRequest('/admin/audit?limit=30'),
      ])
      setSummary(metrics)
      setMembers(directory)
      setClasses(scheduledClasses)
      setMemberships(inquiries)
      setExercises(exerciseList)
      setAudit(logs)
    } catch (issue) { setError(issue.message || 'Administrator records could not be loaded.') }
  }
  useEffect(() => { load() }, [user?.role])

  const findMembers = async (event) => {
    event.preventDefault()
    setLoading(true)
    try { setMembers(await apiRequest(`/admin/members?search=${encodeURIComponent(search)}&limit=50`)) }
    catch (issue) { toast(issue.message || 'Member search could not be completed.', 'error') }
    finally { setLoading(false) }
  }

  const setMemberActive = async (member) => {
    try {
      const updated = await apiRequest(`/admin/members/${member.id}/active`, { method: 'PATCH', body: JSON.stringify({ active: !member.active }) })
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, active: updated.active } : item))
      toast(`Member ${updated.active ? 'reactivated' : 'deactivated'}.`)
    } catch (issue) { toast(issue.message || 'Member status could not be changed.', 'error') }
  }

  const setMembershipStatus = async (membership, status) => {
    try {
      await apiRequest(`/admin/memberships/${membership.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await load()
      toast('Membership inquiry status updated.')
    } catch (issue) { toast(issue.message || 'Membership status could not be updated.', 'error') }
  }

  const createClass = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      await apiRequest('/admin/classes', { method: 'POST', body: JSON.stringify({
        ...classDraft, durationMinutes: Number(classDraft.durationMinutes), capacity: Number(classDraft.capacity),
        startTime: new Date(classDraft.startTime).toISOString(),
      }) })
      setClassDraft(EMPTY_CLASS)
      await load()
      toast('Class scheduled.')
    } catch (issue) { toast(issue.message || 'Class could not be created.', 'error') }
    finally { setLoading(false) }
  }

  const cancelClass = async (item) => {
    if (!window.confirm(`Cancel ${item.title}? Members with an active reservation will be notified.`)) return
    try {
      await apiRequest(`/admin/classes/${item.id}`, { method: 'PATCH', body: JSON.stringify({
        title: item.title, coachName: item.coach_name, startTime: item.start_time,
        durationMinutes: item.duration_minutes, capacity: item.capacity, intensity: item.intensity,
        description: item.description, status: 'cancelled',
      }) })
      await load()
      toast('Class cancelled.')
    } catch (issue) { toast(issue.message || 'Class could not be cancelled.', 'error') }
  }

  const loadClassBookings = async (classId) => {
    try {
      const bookings = await apiRequest(`/admin/classes/${classId}/bookings`)
      setClassBookings((current) => ({ ...current, [classId]: bookings }))
    }
    catch (issue) { toast(issue.message || 'Class bookings could not be loaded.', 'error') }
  }

  const recordAttendance = async (classId, bookingId, status) => {
    try {
      await apiRequest(`/admin/classes/${classId}/attendance`, { method: 'PATCH', body: JSON.stringify({ bookingId, status }) })
      await loadClassBookings(classId)
      toast('Attendance recorded.')
    } catch (issue) { toast(issue.message || 'Attendance could not be saved.', 'error') }
  }

  const setExerciseActive = async (exercise) => {
    try {
      await apiRequest(`/admin/exercises/${exercise.id}`, { method: 'PATCH', body: JSON.stringify({
        name: exercise.name, muscleGroup: exercise.muscle_group, sets: exercise.sets, reps: exercise.reps,
        difficulty: exercise.difficulty, restSeconds: exercise.rest_seconds, description: exercise.description,
        equipment: exercise.equipment, instructions: exercise.instructions || [], active: !exercise.active,
      }) })
      await load()
      toast(`Exercise ${exercise.active ? 'deactivated' : 'reactivated'}.`)
    } catch (issue) { toast(issue.message || 'Exercise status could not be changed.', 'error') }
  }

  if (!summary && !error) return <div className="space-y-5"><PageHeader eyebrow="Administration" title="FORGE. operations" /><Skeleton className="h-48" /><Skeleton className="h-64" /></div>
  if (error && !summary) return <Empty icon={ShieldCheck} title="Admin access unavailable" text={error} action={<Button onClick={load}>Try again</Button>} />

  return <div className="space-y-6">
    <PageHeader eyebrow="Administration" title="FORGE. operations" sub="Administrative actions are checked by role on every API request." />
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <Stat icon={Users} label="Registered members" value={summary.members} />
      <Stat icon={ShieldCheck} label="Active memberships" value={summary.active_memberships} />
      <Stat icon={Users} label="Completed workouts" value={summary.completed_workouts} />
      <Stat icon={CalendarDays} label="Upcoming classes" value={summary.upcoming_classes} />
      <Stat icon={Users} label="Active bookings" value={summary.active_bookings} />
      <Stat icon={ClipboardList} label="Pending inquiries" value={summary.pending_inquiries} />
    </div>

    <Card><h2 className="font-bold text-lg mb-3">Member management</h2>
      <form className="flex gap-2 mb-4" onSubmit={findMembers}><label className="sr-only" htmlFor="admin-member-search">Search members by name or email</label><input id="admin-member-search" className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email…" maxLength={100} /><Button type="submit" disabled={loading}><Search size={16} />Search</Button></form>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-mute"><tr><th className="py-2 pr-3">Member</th><th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Role / status</th><th className="py-2 pr-3">Joined</th><th className="py-2">Action</th></tr></thead><tbody>{members.map((member) => <tr key={member.id} className="border-t border-ink/10"><td className="py-3 pr-3 font-medium">{member.full_name}</td><td className="py-3 pr-3">{member.email}</td><td className="py-3 pr-3 capitalize">{member.role} · {member.active ? 'active' : 'inactive'}</td><td className="py-3 pr-3">{new Date(member.created_at).toLocaleDateString()}</td><td className="py-3"><Button size="sm" variant="soft" disabled={member.role === 'admin'} onClick={() => setMemberActive(member)}>{member.active ? 'Deactivate' : 'Reactivate'}</Button></td></tr>)}</tbody></table></div>
      <p className="text-xs text-mute mt-3">Administrators cannot deactivate their own account or another administrator. Credentials are excluded from this directory.</p>
    </Card>

    <Card><h2 className="font-bold text-lg mb-4">Class scheduling</h2><form onSubmit={createClass} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <Field label="Class title"><input className="input" required maxLength={100} value={classDraft.title} onChange={(event) => setClassDraft({ ...classDraft, title: event.target.value })} /></Field>
      <Field label="Coach name"><input className="input" required maxLength={100} value={classDraft.coachName} onChange={(event) => setClassDraft({ ...classDraft, coachName: event.target.value })} /></Field>
      <Field label="Start time"><input className="input" required type="datetime-local" value={classDraft.startTime} onChange={(event) => setClassDraft({ ...classDraft, startTime: event.target.value })} /></Field>
      <Field label="Duration (minutes)"><input className="input" required type="number" min="1" max="300" value={classDraft.durationMinutes} onChange={(event) => setClassDraft({ ...classDraft, durationMinutes: event.target.value })} /></Field>
      <Field label="Capacity"><input className="input" required type="number" min="1" max="500" value={classDraft.capacity} onChange={(event) => setClassDraft({ ...classDraft, capacity: event.target.value })} /></Field>
      <Field label="Intensity"><select className="input" value={classDraft.intensity} onChange={(event) => setClassDraft({ ...classDraft, intensity: event.target.value })}>{['Easy', 'Medium', 'Hard'].map((value) => <option key={value}>{value}</option>)}</select></Field>
      <Field label="Description"><input className="input" maxLength={1000} value={classDraft.description} onChange={(event) => setClassDraft({ ...classDraft, description: event.target.value })} /></Field>
      <div className="self-end"><Button disabled={loading} type="submit">Create class</Button></div>
    </form>
      <ul className="divide-y divide-ink/10">{classes.map((item) => <li key={item.id} className="py-3 flex flex-wrap items-center gap-3 justify-between"><div><p className="font-semibold">{item.title} · {item.coach_name}</p><p className="text-xs text-mute">{new Date(item.start_time).toLocaleString()} · {item.booked_count}/{item.capacity} booked · {item.status}</p></div><div className="flex gap-2"><details onToggle={(event) => { if (event.currentTarget.open && !classBookings[item.id]) loadClassBookings(item.id) }}><summary className="cursor-pointer rounded-full border border-ink/10 px-3 py-2 text-sm">Attendance</summary><div className="absolute z-10 mt-2 max-h-72 overflow-auto rounded-xl border border-ink/10 bg-card p-3 shadow-xl">{(classBookings[item.id] || []).map((booking) => <div key={booking.booking_id} className="flex items-center gap-3 py-2"><span className="text-xs">{booking.full_name} · {booking.booking_status}</span><select aria-label={`Attendance for ${booking.full_name}`} className="input !w-auto !py-1" value={booking.attendance_status} disabled={booking.booking_status !== 'booked'} onChange={(event) => recordAttendance(item.id, booking.booking_id, event.target.value)}><option value="unknown">Unknown</option><option value="attended">Attended</option><option value="no_show">No show</option></select></div>)}</div></details>{item.status === 'active' && <Button size="sm" variant="danger" onClick={() => cancelClass(item)}>Cancel class</Button>}</div></li>)}</ul>
    </Card>

    <Card><h2 className="font-bold text-lg mb-3">Membership inquiries and status</h2>{memberships.length ? <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-mute"><tr><th className="py-2 pr-3">Member</th><th className="py-2 pr-3">Plan</th><th className="py-2">Status</th></tr></thead><tbody>{memberships.map((item) => <tr key={item.id} className="border-t border-ink/10"><td className="py-3 pr-3">{item.full_name}<span className="block text-xs text-mute">{item.email}</span></td><td className="py-3 pr-3">{item.plan_name}</td><td className="py-3"><select className="input !w-auto !py-2" value={item.status} aria-label={`Membership status for ${item.full_name}`} onChange={(event) => setMembershipStatus(item, event.target.value)}>{['pending', 'active', 'cancelled', 'expired'].map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div> : <p className="text-sm text-mute">No membership records yet.</p>}<p className="text-xs text-mute mt-3">Changing status records an administrative action only; no payment is processed.</p></Card>

    <Card><h2 className="font-bold text-lg mb-3">Exercise catalog</h2><div className="max-h-96 overflow-auto divide-y divide-ink/10">{exercises.map((exercise) => <div key={exercise.id} className="flex items-center justify-between gap-3 py-2.5"><div><p className="text-sm font-medium">{exercise.name}</p><p className="text-xs text-mute">{exercise.muscle_group} · {exercise.equipment} · {exercise.active ? 'active' : 'inactive'}</p></div><Button size="sm" variant="soft" onClick={() => setExerciseActive(exercise)}>{exercise.active ? 'Deactivate' : 'Reactivate'}</Button></div>)}</div><p className="text-xs text-mute mt-3">Referenced exercises are deactivated rather than deleted, preserving workout history.</p></Card>

    <Card><h2 className="font-bold text-lg mb-3">Recent administrative audit events</h2>{audit.length ? <ul className="space-y-2">{audit.map((entry) => <li key={entry.id} className="flex justify-between gap-3 rounded-lg bg-bg/50 p-3 text-xs"><span>{entry.action} · {entry.record_type} {entry.record_id || ''}</span><time className="text-mute shrink-0">{new Date(entry.created_at).toLocaleString()}</time></li>)}</ul> : <p className="text-sm text-mute">No administrative actions have been recorded.</p>}</Card>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </div>
}
