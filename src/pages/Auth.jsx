import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button, Logo } from '../components/ui'
import { useAuth } from '../context/auth'

const safeDestination = (value) => value?.startsWith('/app') && !value.startsWith('//') ? value : '/app'

export default function Auth({ signup = false }) {
  const { login, signup: createAccount } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', weeklyGoalWorkouts: 3, weeklyGoalMinutes: 150 })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const from = location.state?.from
  const destination = safeDestination(from ? `${from.pathname}${from.search || ''}${from.hash || ''}` : search.get('next'))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (signup && form.password !== form.confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      if (signup) {
        await createAccount({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          weeklyGoalWorkouts: Number(form.weeklyGoalWorkouts),
          weeklyGoalMinutes: Number(form.weeklyGoalMinutes),
        })
      } else {
        await login(form.email, form.password)
      }
      navigate(destination, { replace: true })
    } catch (issue) {
      setError(issue.message || 'We could not complete that request.')
    } finally {
      setBusy(false)
    }
  }

  const field = (label, key, props = {}) => (
    <label className="block text-sm font-medium">
      <span className="mb-1.5 block">{label}</span>
      <input
        className="input"
        required
        value={form[key]}
        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
        {...props}
      />
    </label>
  )

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute -top-40 -right-24 w-96 h-96 rounded-full bg-brand/20 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-mute hover:text-ink mb-8"><ArrowLeft size={16} />Back to FORGE.</Link>
        <section className="glass rounded-3xl p-6 sm:p-9">
          <Logo />
          <p className="eyebrow mt-8 mb-2">{signup ? 'Your training starts here' : 'Welcome back'}</p>
          <h1 className="h-display text-4xl">{signup ? 'Create account' : 'Member sign in'}</h1>
          <p className="text-sm text-mute mt-2">{signup ? 'Set your goals and build a stronger routine.' : 'Sign in to continue your training.'}</p>
          <form onSubmit={submit} className="space-y-4 mt-7">
            {signup && field('Full name', 'fullName', { autoComplete: 'name', maxLength: 100 })}
            {field('Email', 'email', { type: 'email', autoComplete: 'email', maxLength: 254 })}
            {field('Password', 'password', { type: 'password', autoComplete: signup ? 'new-password' : 'current-password', minLength: 8, maxLength: 72 })}
            {signup && field('Confirm password', 'confirm', { type: 'password', autoComplete: 'new-password', minLength: 8, maxLength: 72 })}
            {signup && <div className="grid grid-cols-2 gap-3">
              {field('Workouts / week', 'weeklyGoalWorkouts', { type: 'number', min: 1, max: 7 })}
              {field('Minutes / week', 'weeklyGoalMinutes', { type: 'number', min: 1, max: 2000 })}
            </div>}
            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'} {!busy && <ArrowRight size={17} />}
            </Button>
          </form>
          <p className="text-sm text-mute text-center mt-6">
            {signup ? 'Already a member?' : 'New to FORGE.?'}{' '}
            <Link className="text-brand font-semibold" to={`${signup ? '/login' : '/signup'}${search.get('next') ? `?next=${encodeURIComponent(search.get('next'))}` : ''}`}>
              {signup ? 'Sign in' : 'Create account'}
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
