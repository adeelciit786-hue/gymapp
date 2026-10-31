import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Moon, Settings2, Sun, Trash2, UserRound } from 'lucide-react'
import { Button, Card, Empty, Field, PageHeader, Skeleton } from '../components/ui'
import { useStore } from '../context/store'
import { useToast } from '../context/toast'
import { apiRequest } from '../utils/api'
import { useAuth } from '../context/auth'

const DEFAULTS = { theme: 'dark', reducedMotion: false, notifications: true, restTimerSeconds: 60, units: 'metric' }

export default function Settings() {
  const { dispatch } = useStore()
  const toast = useToast()
  const { updateUser } = useAuth()
  const [settings, setSettings] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [emailForm, setEmailForm] = useState({ email: '', currentPassword: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [savingAccount, setSavingAccount] = useState(false)
  const load = () => {
    setError('')
    return apiRequest('/settings')
      .then((value) => {
      setSettings({
        ...value,
        preferences: { ...DEFAULTS, ...value.preferences },
      })
      if (value.preferences?.theme === 'light' || value.preferences?.theme === 'dark') dispatch({ type: 'theme', v: value.preferences.theme })
      })
      .catch((issue) => setError(issue.message || 'Settings could not be loaded.'))
  }
  useEffect(() => { load() }, [])

  const updatePreference = (key, value) => setSettings((current) => ({ ...current, preferences: { ...current.preferences, [key]: value } }))
  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const saved = await apiRequest('/settings', { method: 'PUT', body: JSON.stringify({
        preferences: settings.preferences,
        weeklyGoalWorkouts: Number(settings.weekly_goal_workouts),
        weeklyGoalMinutes: Number(settings.weekly_goal_minutes),
      }) })
      setSettings((current) => ({ ...current, preferences: saved.preferences, weekly_goal_workouts: saved.weeklyGoalWorkouts, weekly_goal_minutes: saved.weeklyGoalMinutes }))
      dispatch({ type: 'theme', v: saved.preferences.theme })
      toast('Preferences saved to your account.')
    } catch (issue) { setError(issue.message || 'Settings could not be saved.') }
    finally { setSaving(false) }
  }
  const exportData = async () => {
    setExporting(true)
    try {
      const personalData = await apiRequest('/privacy/export')
      const url = URL.createObjectURL(new Blob([JSON.stringify(personalData, null, 2)], { type: 'application/json' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `forge-data-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast('Personal data export downloaded.')
    } catch (issue) { toast(issue.message || 'Data export could not be created.', 'error') }
    finally { setExporting(false) }
  }
  const updateEmail = async (event) => {
    event.preventDefault()
    setSavingAccount(true)
    try {
      const result = await apiRequest('/account/email', { method: 'PUT', body: JSON.stringify(emailForm) })
      setSettings((current) => ({ ...current, email: result.email }))
      updateUser({ email: result.email })
      setEmailForm({ email: '', currentPassword: '' })
      toast('Account email updated.')
    } catch (issue) { setError(issue.message || 'Email could not be updated.') }
    finally { setSavingAccount(false) }
  }
  const updatePassword = async (event) => {
    event.preventDefault()
    setSavingAccount(true)
    try {
      const result = await apiRequest('/account/password', { method: 'PUT', body: JSON.stringify(passwordForm) })
      updateUser(result.user)
      setPasswordForm({ currentPassword: '', newPassword: '' })
      toast('Password updated. Other active sessions were invalidated.')
    } catch (issue) { setError(issue.message || 'Password could not be updated.') }
    finally { setSavingAccount(false) }
  }
  const deleteAccount = async (event) => {
    event.preventDefault()
    if (!window.confirm('Permanently delete your FORGE account and associated member data? This cannot be undone.')) return
    setSaving(true)
    try {
      await apiRequest('/account/delete', { method: 'POST', body: JSON.stringify({ currentPassword: deletePassword }) })
      toast('Your account was deleted.')
      window.location.assign('/login')
    } catch (issue) { setError(issue.message || 'Account deletion failed.') }
    finally { setSaving(false) }
  }

  if (!settings && error) return <Empty icon={Settings2} title="Settings unavailable" text={error} action={<Button onClick={load}>Try again</Button>} />
  if (!settings) return <div className="space-y-5"><PageHeader eyebrow="Settings" title="Preferences" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>

  return <div className="space-y-6 max-w-3xl">
    <PageHeader eyebrow="Settings" title="Preferences" sub="Account and training preferences are saved to your member profile." />
    <Card className="space-y-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-bold flex items-center gap-2"><UserRound size={18} className="text-brand" />Account</h2><p className="text-sm text-mute mt-1">{settings.email} · Member since {new Date(settings.created_at).toLocaleDateString()}</p></div><Link to="/app/profile" className="text-sm text-brand font-semibold">Edit profile</Link></div>
      <form onSubmit={updateEmail} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"><Field label="New email"><input className="input" type="email" required maxLength={254} value={emailForm.email} onChange={(event) => setEmailForm({ ...emailForm, email: event.target.value })} /></Field><Field label="Current password"><input className="input" type="password" required maxLength={72} autoComplete="current-password" value={emailForm.currentPassword} onChange={(event) => setEmailForm({ ...emailForm, currentPassword: event.target.value })} /></Field><Button disabled={savingAccount} type="submit">Update email</Button></form>
      <form onSubmit={updatePassword} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end border-t border-ink/10 pt-5"><Field label="Current password"><input className="input" type="password" required maxLength={72} autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></Field><Field label="New password (8+ characters)"><input className="input" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></Field><Button disabled={savingAccount} type="submit">Change password</Button></form>
    </Card>
    <form onSubmit={save} className="space-y-5">
      <Card><h2 className="font-bold mb-4">Fitness goals</h2><div className="grid sm:grid-cols-2 gap-3">
        <Field label="Workouts per week"><input className="input" type="number" min="1" max="7" required value={settings.weekly_goal_workouts} onChange={(event) => setSettings({ ...settings, weekly_goal_workouts: event.target.value })} /></Field>
        <Field label="Active minutes per week"><input className="input" type="number" min="1" max="2000" required value={settings.weekly_goal_minutes} onChange={(event) => setSettings({ ...settings, weekly_goal_minutes: event.target.value })} /></Field>
      </div></Card>
      <Card className="space-y-5"><h2 className="font-bold">Application preferences</h2>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">Appearance</p><p className="text-xs text-mute">Saved to your account and applied immediately after save.</p></div><div className="flex gap-2"><button type="button" aria-pressed={settings.preferences.theme === 'dark'} onClick={() => updatePreference('theme', 'dark')} className={`rounded-full border px-4 py-2 text-sm ${settings.preferences.theme === 'dark' ? 'border-brand bg-brand/15 text-brand' : 'border-ink/10'}`}><Moon size={14} className="inline mr-1" />Dark</button><button type="button" aria-pressed={settings.preferences.theme === 'light'} onClick={() => updatePreference('theme', 'light')} className={`rounded-full border px-4 py-2 text-sm ${settings.preferences.theme === 'light' ? 'border-brand bg-brand/15 text-brand' : 'border-ink/10'}`}><Sun size={14} className="inline mr-1" />Light</button></div></div>
        <label className="flex items-center justify-between gap-4"><span><span className="block font-medium">Reduced motion</span><span className="text-xs text-mute">Reduce non-essential movement where supported.</span></span><input type="checkbox" checked={settings.preferences.reducedMotion} onChange={(event) => updatePreference('reducedMotion', event.target.checked)} /></label>
        <label className="flex items-center justify-between gap-4"><span><span className="block font-medium">In-app notification preference</span><span className="text-xs text-mute">Controls your preference; no email or push messages are sent.</span></span><input type="checkbox" checked={settings.preferences.notifications} onChange={(event) => updatePreference('notifications', event.target.checked)} /></label>
        <div className="grid sm:grid-cols-2 gap-3"><Field label="Default rest timer (seconds)"><input className="input" type="number" min="0" max="900" step="5" value={settings.preferences.restTimerSeconds} onChange={(event) => updatePreference('restTimerSeconds', Number(event.target.value))} /></Field><Field label="Measurement units"><select className="input" value={settings.preferences.units} onChange={(event) => updatePreference('units', event.target.value)}><option value="metric">Metric (kg, cm)</option><option value="imperial">Imperial (lb, in)</option></select></Field></div>
      </Card>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</Button>
    </form>
    <Card><h2 className="font-bold mb-1">Privacy and account data</h2><p className="text-sm text-mute mb-4">Export your saved member records as JSON, or request permanent account deletion. Deletion requires your current password and removes associated member records.</p><Button type="button" variant="soft" disabled={exporting} onClick={exportData}><Download size={16} />{exporting ? 'Preparing export…' : 'Download my data'}</Button></Card>
    <Card className="!border-red-400/30"><h2 className="font-bold flex items-center gap-2 text-red-400"><Trash2 size={17} />Delete account</h2><p className="text-sm text-mute mt-1 mb-4">This is permanent. Completed workout history and associated records will be removed with the account.</p><form onSubmit={deleteAccount} className="flex flex-col sm:flex-row gap-3"><label className="flex-1 text-sm font-medium">Current password<input className="input mt-1.5" type="password" autoComplete="current-password" required maxLength={72} value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} /></label><Button type="submit" variant="danger" disabled={saving} className="sm:mt-6">{saving ? 'Deleting…' : 'Delete account'}</Button></form></Card>
  </div>
}
