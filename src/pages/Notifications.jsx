import { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { Button, Card, Empty, PageHeader, Skeleton } from '../components/ui'
import { useToast } from '../context/toast'
import { apiRequest } from '../utils/api'

export default function Notifications() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/notifications')
      .then((rows) => { if (active) setItems(rows) })
      .catch((issue) => { if (active) setError(issue.message || 'Notifications are unavailable.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const markRead = async (item) => {
    try {
      await apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH', body: '{}' })
      setItems((current) => current.map((notice) => notice.id === item.id ? { ...notice, is_read: true } : notice))
    } catch (issue) { toast(issue.message || 'Notification could not be updated.', 'error') }
  }
  const markAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH', body: '{}' })
      setItems((current) => current.map((notice) => ({ ...notice, is_read: true })))
      toast('All notifications marked as read.')
    } catch (issue) { toast(issue.message || 'Notifications could not be updated.', 'error') }
  }

  if (loading) return <div className="space-y-5"><Skeleton className="h-14 w-2/3" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
  if (error) return <Empty title="Notifications unavailable" text={error} action={<Button onClick={() => window.location.reload()}>Try again</Button>} />

  return <div className="space-y-6">
    <PageHeader eyebrow="Member updates" title="Notifications" sub="In-app updates for bookings and completed training.">{items.some((item) => !item.is_read) && <Button variant="ghost" onClick={markAllRead}>Mark all as read</Button>}</PageHeader>
    {items.length ? <div className="space-y-3">{items.map((item) => <Card key={item.id} className={`flex items-start gap-3 ${item.is_read ? 'opacity-75' : '!border-brand/50'}`}>
      <Bell size={18} className="text-brand shrink-0 mt-1" /><div className="flex-1 min-w-0"><h2 className="font-bold">{item.title}</h2><p className="text-sm text-mute mt-1">{item.message}</p><p className="text-xs text-mute mt-2">{new Date(item.created_at).toLocaleString()}</p></div>
      {!item.is_read && <Button variant="ghost" size="sm" onClick={() => markRead(item)} aria-label={`Mark ${item.title} as read`}><Check size={16} />Read</Button>}
    </Card>)}</div> : <Empty icon={Bell} title="You’re all caught up." text="New booking and workout notifications will appear here." />}
  </div>
}
