import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Menu, X, ArrowRight, Star, Award, ChevronDown } from 'lucide-react'
import { Logo, Button, CountUp, Img, Reveal } from '../components/ui'
import Pricing from '../components/Pricing'
import { ThemeToggle } from '../components/AppLayout'
import { IMG } from '../data/misc'
import { TRAINERS } from '../data/trainers'
import { useToast } from '../context/toast'
import { apiRequest } from '../utils/api'
import { useAuth } from '../context/auth'

const LINKS = [['Programs', '#programs'], ['Facilities', '#facilities'], ['Coaches', '#coaches'], ['Memberships', '#memberships']]
const TESTIMONIALS = [
  ['Sample member', 'FORGE made planning my week effortless. The tracking keeps me honest.', 'Sample · Muscle Building'],
  ['Sample member', 'The classes are the perfect mix of intensity and community.', 'Sample · Fat Loss'],
  ['Sample member', 'I finally see my strength going up, week after week.', 'Sample · Strength'],
]

function Nav() {
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  useEffect(() => { const f = () => setSolid(window.scrollY > 40); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f) }, [])
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${solid || open ? 'glass !border-x-0 !border-t-0' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <Logo />
        <nav className="hidden lg:flex items-center gap-8" aria-label="Primary">
          {LINKS.map(([l, h]) => <a key={h} href={h} className="text-sm font-medium text-ink/80 hover:text-brand transition">{l}</a>)}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button as={Link} to="/app" size="sm" className="hidden sm:inline-flex">Member App</Button>
          <Button as="a" href="#memberships" variant="ghost" size="sm" className="hidden md:inline-flex">Join Now</Button>
          <button onClick={() => setOpen((o) => !o)} className="lg:hidden p-2.5 rounded-xl hover:bg-ink/5" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden px-4 pb-6 pt-2 space-y-1">
          {LINKS.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)} className="block py-3.5 text-lg font-display font-semibold border-b border-ink/10">{l}</a>)}
          <div className="flex gap-3 pt-4"><Button as={Link} to="/app" className="flex-1">Member App</Button><Button as="a" href="#memberships" variant="ghost" onClick={() => setOpen(false)} className="flex-1">Join Now</Button></div>
        </div>
      )}
    </header>
  )
}

export default function Landing() {
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(false)
  const [plans, setPlans] = useState(null)
  const [plansError, setPlansError] = useState(false)
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 600], [0, 120])
  const choose = () => {
    toast('Plans are illustrative. No payment is collected.', 'info')
    nav(user ? '/app/membership' : '/signup')
  }
  useEffect(() => {
    let active = true
    apiRequest('/stats')
      .then((result) => { if (active) setStats(result) })
      .catch(() => { if (active) setStatsError(true) })
    apiRequest('/membership-plans')
      .then((result) => {
        if (active) setPlans(result.map((plan) => ({
          ...plan,
          price: Number(plan.price),
          tag: plan.description,
          feats: plan.features,
          pop: plan.id === 'performance',
        })))
      })
      .catch(() => { if (active) setPlansError(true) })
    return () => { active = false }
  }, [])

  return (
    <div>
      <Nav />
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        <motion.div style={{ y }} className="absolute inset-0 -top-20">
          <Img src={IMG.hero} alt="" loading="eager" fetchPriority="high" className="w-full h-[120%] object-cover" fallback={<span />} />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#101B2A] via-[#101B2A]/60 to-[#101B2A]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#101B2A] via-[#101B2A]/50 to-transparent" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand/30 blur-[140px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-24 w-full text-[#F5F4F0]">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="eyebrow mb-5">Your limits are meant to be broken.</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8 }} className="h-display text-[clamp(2.6rem,10vw,8rem)] max-w-5xl">
            Build your <span className="text-brand">strongest</span> self.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 text-base sm:text-xl text-[#F5F4F0]/80 max-w-xl">Elite training. Smarter progress. Unstoppable results.</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button as={Link} to="/app" size="lg">Start Training <ArrowRight size={18} /></Button>
            <Button as="a" href="#memberships" variant="ghost" size="lg" className="!text-[#F5F4F0]">Explore Memberships</Button>
          </motion.div>
          <div className="mt-14 sm:mt-20 grid grid-cols-3 gap-3 sm:gap-8 max-w-2xl">
            {[[stats?.members, 'Registered members'], [stats?.completed_workouts, 'Completed workouts'], [stats?.classes_this_week, 'Classes this week']].map(([n, label]) => (
              <div key={label}><div className="font-display text-3xl sm:text-5xl font-bold">{Number.isInteger(n) ? <CountUp to={n} /> : '—'}</div><div className="text-[11px] sm:text-sm text-[#F5F4F0]/70 mt-1">{label}</div></div>
            ))}
          </div>
          <p className="text-[11px] text-[#F5F4F0]/50 mt-4" role={statsError ? 'status' : undefined}>{statsError ? 'Live totals are temporarily unavailable.' : 'Live totals from the FORGE. member platform.'}</p>
        </div>
        <a href="#programs" aria-label="Scroll down" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#F5F4F0]/60 animate-bounce hidden sm:block"><ChevronDown /></a>
      </section>

      <section id="programs" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 scroll-mt-16">
        <Reveal><p className="eyebrow mb-3">Featured programs</p><h2 className="h-display text-4xl sm:text-6xl max-w-3xl">Train with purpose.</h2></Reveal>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {IMG.programs.map(([t, d, src], i) => (
            <Reveal key={t} delay={i * 0.1}>
              <Link to="/app/planner" className="group block relative overflow-hidden rounded-3xl aspect-[4/5] lift">
                <Img src={src} alt={t} className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101B2A] via-[#101B2A]/30 to-transparent" />
                <div className="absolute bottom-0 p-6 text-[#F5F4F0]"><h3 className="font-display text-2xl font-bold uppercase">{t}</h3><p className="text-sm text-[#F5F4F0]/75 mt-1">{d}</p><span className="inline-flex items-center gap-1 text-brand text-sm font-semibold mt-3">View plans <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span></div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="facilities" className="bg-bg2 py-20 sm:py-28 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal><p className="eyebrow mb-3">Facilities</p><h2 className="h-display text-4xl sm:text-6xl max-w-3xl">Spaces built for performance.</h2></Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mt-12">
            {IMG.facilities.map(([t, src], i) => (
              <Reveal key={t} delay={i * 0.08}>
                <div className="group relative overflow-hidden rounded-2xl aspect-[3/4]">
                  <Img src={src} alt={t} className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101B2A]/90 to-transparent" />
                  <h3 className="absolute bottom-4 left-4 right-4 font-display font-bold text-lg text-[#F5F4F0]">{t}</h3>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="coaches" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 scroll-mt-16">
        <Reveal className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3">Coaches</p><h2 className="h-display text-4xl sm:text-6xl">Meet your edge.</h2></div><Button as={Link} to="/app/trainers" variant="ghost">All trainers <ArrowRight size={16} /></Button></Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mt-12">
          {TRAINERS.slice(0, 4).map((t, i) => (
            <Reveal key={t.id} delay={i * 0.08}>
              <Link to="/app/trainers" className="group block surface overflow-hidden lift">
                <div className="aspect-[4/5] overflow-hidden"><Img src={t.img} alt={t.name} className="w-full h-full object-cover object-top transition duration-700 group-hover:scale-105" fallback={<span className="font-display text-4xl font-bold">{t.name.split(' ').map((w) => w[0]).join('')}</span>} /></div>
                <div className="p-4"><h3 className="font-bold">{t.name}</h3><p className="text-xs text-brand">{t.spec}</p><p className="text-xs text-mute mt-1">{t.exp} yrs experience</p></div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-bg2 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal><p className="eyebrow mb-3">Member stories</p><h2 className="h-display text-4xl sm:text-6xl">Sample testimonials.</h2><p className="text-xs text-mute mt-2">Clearly labeled sample content for demonstration purposes.</p></Reveal>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {TESTIMONIALS.map(([n, q, r], i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="surface p-6 h-full"><div className="flex gap-1 text-gold mb-4">{[...Array(5)].map((_, k) => <Star key={k} size={16} fill="currentColor" />)}</div><p className="text-lg leading-snug">“{q}”</p><p className="text-sm text-mute mt-5">{n} · {r}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="memberships" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 scroll-mt-16">
        <Reveal className="text-center mb-10"><p className="eyebrow mb-3">Memberships</p><h2 className="h-display text-4xl sm:text-6xl">Pick your level.</h2></Reveal>
        {plans ? <Pricing plans={plans} selected={null} onSelect={choose} showBilling={false} /> : <p className="text-center text-sm text-mute" role={plansError ? 'status' : undefined}>{plansError ? 'Membership plans are temporarily unavailable.' : 'Loading membership plans…'}</p>}
      </section>

      <section className="relative overflow-hidden mx-4 sm:mx-6 mb-16 rounded-3xl bg-gradient-to-br from-brand to-[#c2410c] text-[#101B2A] p-8 sm:p-16 text-center">
        <Award className="mx-auto mb-4" size={40} />
        <h2 className="h-display text-3xl sm:text-6xl max-w-3xl mx-auto">Your limits are meant to be broken.</h2>
        <p className="mt-4 max-w-md mx-auto font-medium">Open the member app and log your first session in minutes.</p>
        <Button as={Link} to="/app" size="lg" className="mt-8 !bg-[#101B2A] !text-[#F5F4F0] !shadow-none">Start Training <ArrowRight size={18} /></Button>
      </section>

      <footer className="border-t border-ink/10 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-3 gap-8">
          <div><Logo /><p className="text-sm text-mute mt-3 max-w-xs">Build Your Strongest Self.</p></div>
          <div className="text-sm space-y-2"><p className="font-semibold">Explore</p>{LINKS.map(([l, h]) => <a key={h} href={h} className="block text-mute hover:text-brand">{l}</a>)}</div>
          <div className="text-sm space-y-2"><p className="font-semibold">Member app</p>{[['Dashboard', '/app'], ['Workout planner', '/app/planner'], ['Class booking', '/app/classes']].map(([l, h]) => <Link key={h} to={h} className="block text-mute hover:text-brand">{l}</Link>)}</div>
        </div>
        <p className="max-w-7xl mx-auto text-xs text-mute mt-10">© FORGE demo prototype. All members, coaches, reviews, prices and figures are fictional. Bookings and payments are not real.</p>
      </footer>
    </div>
  )
}
