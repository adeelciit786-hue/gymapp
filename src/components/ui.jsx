import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { X, Dumbbell } from 'lucide-react'

export function Logo({ className = '', size = 'md' }) {
  const s = size === 'lg' ? 'text-3xl' : 'text-xl'
  return (
    <Link to="/" aria-label="FORGE home" className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size === 'lg' ? 38 : 30} height={size === 'lg' ? 38 : 30} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="rgb(var(--brand))" />
        <path d="M18 14h30v10H29v7h15v10H29v9H18z" fill="#101B2A" />
        <rect x="40" y="43" width="8" height="8" rx="2" fill="#F5F4F0" />
      </svg>
      <span className={`font-display font-bold tracking-[0.12em] ${s}`}>FORGE<span className="text-brand">.</span></span>
    </Link>
  )
}

const VAR = {
  primary: 'bg-brand text-[#101B2A] hover:brightness-110 shadow-glow font-semibold',
  ghost: 'glass hover:border-brand/50 text-ink',
  soft: 'bg-brand/15 text-brand hover:bg-brand/25',
  danger: 'bg-red-500/15 text-red-400 hover:bg-red-500/25',
  plain: 'text-mute hover:text-ink hover:bg-ink/5',
}
export function Button({ as: As = 'button', variant = 'primary', size = 'md', className = '', children, ...p }) {
  const sz = { sm: 'px-3.5 min-h-[40px] text-sm', md: 'px-5 min-h-[46px] text-sm', lg: 'px-7 min-h-[54px] text-base' }[size]
  return (
    <As className={`inline-flex items-center justify-center gap-2 rounded-xl transition active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none ${sz} ${VAR[variant]} ${className}`} {...(As === 'button' ? { type: 'button', ...p } : p)}>
      {children}
    </As>
  )
}

export const Card = ({ className = '', hover, children, ...p }) => (
  <div className={`surface p-5 ${hover ? 'lift' : ''} ${className}`} {...p}>{children}</div>
)

export function Img({ src, alt = '', className = '', fallback, ...p }) {
  const [bad, setBad] = useState(false)
  if (bad || !src) return <div className={`bg-gradient-to-br from-card to-bg2 flex items-center justify-center text-mute ${className}`} role="img" aria-label={alt}>{fallback || <Dumbbell size={28} />}</div>
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBad(true)} className={className} {...p} />
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto surface !rounded-b-none sm:!rounded-2xl p-5 sm:p-7 shadow-2xl`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="p-2.5 -m-2 rounded-lg text-mute hover:text-ink hover:bg-ink/5"><X size={20} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const Field = ({ label, error, hint, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-mute mb-1.5">{label}</span>
    {children}
    {hint && !error && <span className="block text-xs text-mute mt-1">{hint}</span>}
    {error && <span className="block text-xs text-red-400 mt-1" role="alert">{error}</span>}
  </label>
)

export const Chip = ({ active, children, ...p }) => (
  <button type="button" aria-pressed={!!active} className={`shrink-0 px-4 min-h-[40px] rounded-full text-sm font-medium transition border ${active ? 'bg-brand text-[#101B2A] border-brand' : 'border-ink/10 text-mute hover:text-ink hover:border-ink/30'}`} {...p}>{children}</button>
)

export function Ring({ value = 0, size = 120, stroke = 10, children, color = 'rgb(var(--brand))' }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--ink) / .08)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1.1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export const Bar = ({ value, max = 100, color = 'bg-brand', className = '' }) => (
  <div className={`h-2 rounded-full bg-ink/10 overflow-hidden ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={max}>
    <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (value / max) * 100)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
  </div>
)

export function CountUp({ to, suffix = '', duration = 1.6 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (reduce) { setV(to); return }
    let raf, t0
    const step = (t) => { t0 ??= t; const p = Math.min(1, (t - t0) / (duration * 1000)); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration, reduce])
  return <span ref={ref}>{v.toLocaleString('en-US')}{suffix}</span>
}

export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} aria-hidden="true" />

export const Empty = ({ icon: I = Dumbbell, title, text, action }) => (
  <div className="surface p-8 text-center border-dashed">
    <div className="mx-auto w-14 h-14 rounded-2xl bg-brand/15 text-brand flex items-center justify-center mb-4"><I size={26} /></div>
    <h3 className="font-bold text-lg">{title}</h3>
    {text && <p className="text-mute text-sm mt-1 max-w-sm mx-auto">{text}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
)

export const PageHeader = ({ eyebrow, title, sub, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
    <div className="min-w-0">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="h-display text-3xl sm:text-4xl lg:text-5xl break-words">{title}</h1>
      {sub && <p className="text-mute mt-2 max-w-xl text-sm sm:text-base">{sub}</p>}
    </div>
    {children && <div className="flex gap-2 flex-wrap">{children}</div>}
  </div>
)

export const Stat = ({ icon: I, label, value, sub, accent }) => (
  <Card hover className="!p-4 sm:!p-5">
    <div className="flex items-center gap-2 text-mute text-xs font-medium uppercase tracking-wider"><I size={15} className={accent || 'text-brand'} />{label}</div>
    <div className="font-display text-2xl sm:text-3xl font-bold mt-2">{value}</div>
    {sub && <div className="text-xs text-mute mt-1">{sub}</div>}
  </Card>
)

export const DemoNote = ({ children }) => <p className="text-xs text-mute border border-dashed border-ink/15 rounded-xl px-3 py-2 inline-block">ⓘ {children}</p>

export const Reveal = ({ children, delay = 0, className = '' }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay, ease: 'easeOut' }}>{children}</motion.div>
)

export const chartTip = { contentStyle: { background: 'rgb(var(--card))', border: '1px solid rgb(var(--line))', borderRadius: 12, color: 'rgb(var(--ink))', fontSize: 12 }, labelStyle: { color: 'rgb(var(--mute))' }, cursor: { fill: 'rgb(var(--ink) / .05)' } }
export const axis = { stroke: 'rgb(var(--mute))', fontSize: 11, tickLine: false, axisLine: false }
