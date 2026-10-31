import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, Dumbbell, ClipboardList, Library, LineChart, Apple, CalendarDays, Users, Trophy, CreditCard, UserRound, Settings, Menu, Play, ChevronsLeft, ChevronsRight, Sun, Moon, X, Home, LogOut, Bell, Award, History, ShieldCheck } from 'lucide-react'
import { Logo, Skeleton, Modal } from './ui'
import { useStore } from '../context/store'
import { useToast } from '../context/toast'
import { useAuth } from '../context/auth'

const NAV = [
  ['/app', 'Dashboard', LayoutDashboard, true],
  ['/app/planner', 'Planner', ClipboardList],
  ['/app/library', 'Exercises', Library],
  ['/app/analytics', 'Progress', LineChart],
  ['/app/records', 'Personal Records', Award],
  ['/app/history', 'Workout History', History],
  ['/app/notifications', 'Notifications', Bell],
  ['/app/nutrition', 'Nutrition', Apple],
  ['/app/classes', 'Classes', CalendarDays],
  ['/app/trainers', 'Trainers', Users],
  ['/app/achievements', 'Achievements', Trophy],
  ['/app/membership', 'Membership', CreditCard],
  ['/app/profile', 'Profile', UserRound],
  ['/app/settings', 'Settings', Settings],
]
const BOTTOM = [NAV[0], NAV[1], null, NAV[4], 'more']

export const ThemeToggle = ({ className = '' }) => {
  const { state, dispatch } = useStore()
  const dark = state.settings.theme === 'dark'
  return (
    <button onClick={() => dispatch({ type: 'theme', v: dark ? 'light' : 'dark' })} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} className={`p-2.5 rounded-xl text-mute hover:text-ink hover:bg-ink/5 transition ${className}`}>
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  )
}

function SideLink({ to, label, Icon, end, collapsed }) {
  return (
    <NavLink to={to} end={end} title={collapsed ? label : undefined} className={({ isActive }) => `relative flex items-center gap-3 px-3.5 min-h-[44px] rounded-xl text-sm font-medium transition ${isActive ? 'bg-brand/15 text-brand' : 'text-mute hover:text-ink hover:bg-ink/5'}`}>
      {({ isActive }) => (<>
        {isActive && <motion.span layoutId="navbar" className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-brand" />}
        <Icon size={19} className="shrink-0" />
        {!collapsed && <span>{label}</span>}
      </>)}
    </NavLink>
  )
}

const BottomLink = ({ to, label, Icon, end }) => (
  <li><NavLink to={to} end={end} className={({ isActive }) => `flex flex-col items-center justify-center gap-1 min-h-[58px] text-[11px] font-medium ${isActive ? 'text-brand' : 'text-mute'}`}><Icon size={21} />{label}</NavLink></li>
)

export default function AppLayout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const loc = useLocation()
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('forge:side') === '1' } catch { return false } })
  const [more, setMore] = useState(false)
  useEffect(() => { try { localStorage.setItem('forge:side', collapsed ? '1' : '0') } catch { /* ignore */ } }, [collapsed])
  useEffect(() => { setMore(false); window.scrollTo(0, 0) }, [loc.pathname])
  const memberName = user?.fullName || 'Member'
  const initials = memberName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const signOut = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch (error) {
      toast(error.message || 'Could not sign out. Please try again.', 'error')
    }
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className={`hidden lg:flex flex-col sticky top-0 h-screen shrink-0 border-r border-ink/10 bg-bg2/60 backdrop-blur p-4 transition-[width] duration-300 ${collapsed ? 'w-[88px]' : 'w-64'}`}>
        <div className="flex items-center justify-between h-12 mb-4 px-1">{collapsed ? <Logo className="[&>span]:hidden" /> : <Logo />}</div>
        <Link to="/app/library" title="Build workout" className={`mb-4 flex items-center justify-center gap-2 rounded-xl bg-brand text-[#101B2A] font-semibold min-h-[46px] shadow-glow hover:brightness-110 transition ${collapsed ? '' : 'px-4'}`}><Play size={18} fill="currentColor" />{!collapsed && 'Build Workout'}</Link>
        <nav className="flex-1 overflow-y-auto no-scrollbar space-y-1" aria-label="Main">
          {[...NAV, ...(user?.role === 'admin' ? [['/admin', 'Admin', ShieldCheck]] : [])].map(([to, label, Icon, end]) => <SideLink key={to} to={to} label={label} Icon={Icon} end={end} collapsed={collapsed} />)}
        </nav>
        <div className="pt-3 border-t border-ink/10 flex items-center gap-2">
          <Link to="/app/profile" className="flex items-center gap-3 flex-1 min-w-0 rounded-xl p-1.5 hover:bg-ink/5">
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-gold text-[#101B2A] font-bold flex items-center justify-center shrink-0">{initials}</span>
            {!collapsed && <span className="min-w-0 text-left"><span className="block text-sm font-semibold truncate">{memberName}</span><span className="block text-xs text-mute">Member</span></span>}
          </Link>
          {!collapsed && <ThemeToggle />}
          {!collapsed && <button onClick={signOut} aria-label="Log out" title="Log out" className="p-2.5 rounded-xl text-mute hover:text-ink hover:bg-ink/5"><LogOut size={18} /></button>}
          <button onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="p-2.5 rounded-xl text-mute hover:text-ink hover:bg-ink/5">{collapsed ? <ChevronsRight size={19} /> : <ChevronsLeft size={19} />}</button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 glass !border-x-0 !border-t-0">
          <Logo />
          <div className="flex items-center"><ThemeToggle /><Link to="/app/profile" aria-label={`Profile: ${memberName}`} className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-gold text-[#101B2A] text-xs font-bold flex items-center justify-center ml-1">{initials}</Link><button onClick={signOut} aria-label="Log out" title="Log out" className="p-2.5 ml-1 rounded-xl text-mute hover:text-ink hover:bg-ink/5"><LogOut size={18} /></button></div>
        </header>
        <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-28 lg:pb-12 max-w-[1400px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Suspense fallback={<div className="space-y-4"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>}><Outlet /></Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass !border-x-0 !border-b-0 px-2 pb-[env(safe-area-inset-bottom)]" aria-label="Mobile">
        <ul className="grid grid-cols-5 items-end">
          {BOTTOM.map((it, i) => it === null ? (
            <li key="go" className="flex justify-center"><Link to="/app/library" aria-label="Build a workout" className="-mt-6 w-14 h-14 rounded-full bg-brand text-[#101B2A] flex items-center justify-center shadow-glow"><Play size={24} fill="currentColor" /></Link></li>
          ) : it === 'more' ? (
            <li key="more"><button onClick={() => setMore(true)} className="w-full flex flex-col items-center justify-center gap-1 min-h-[58px] text-[11px] font-medium text-mute"><Menu size={21} />More</button></li>
          ) : (
            <BottomLink key={it[0]} to={it[0]} label={it[1]} Icon={it[2]} end={it[3]} />
          ))}
        </ul>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} title="More">
        <div className="grid grid-cols-3 gap-3">
          {[...NAV, ...(user?.role === 'admin' ? [['/admin', 'Admin', ShieldCheck]] : [])].filter(([to]) => !['/app', '/app/planner', '/app/nutrition'].includes(to)).map(([to, label, Icon]) => (
            <Link key={to} to={to} className="surface flex flex-col items-center gap-2 py-4 text-xs font-medium hover:border-brand/50"><Icon size={22} className="text-brand" />{label}</Link>
          ))}
          <Link to="/" className="surface flex flex-col items-center gap-2 py-4 text-xs font-medium hover:border-brand/50"><Home size={22} className="text-brand" />Website</Link>
        </div>
      </Modal>
    </div>
  )
}
