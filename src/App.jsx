import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import { Skeleton } from './components/ui'
import { useAuth } from './context/auth'

const Planner = lazy(() => import('./pages/Planner'))
const Library = lazy(() => import('./pages/Library'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Nutrition = lazy(() => import('./pages/Nutrition'))
const Classes = lazy(() => import('./pages/Classes'))
const Trainers = lazy(() => import('./pages/Trainers'))
const Membership = lazy(() => import('./pages/Membership'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const LiveWorkout = lazy(() => import('./pages/LiveWorkout'))
const Records = lazy(() => import('./pages/Records'))
const Notifications = lazy(() => import('./pages/Notifications'))
const History = lazy(() => import('./pages/History'))
const Admin = lazy(() => import('./pages/Admin'))

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Skeleton className="h-screen" />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/signup" element={<Auth signup />} />
      <Route path="/app/workout" element={<ProtectedRoute><Suspense fallback={<Skeleton className="h-screen" />}><LiveWorkout /></Suspense></ProtectedRoute>} />
      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="planner" element={<Planner />} />
        <Route path="library" element={<Library />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="records" element={<Suspense fallback={<Skeleton className="h-screen" />}><Records /></Suspense>} />
        <Route path="history" element={<Suspense fallback={<Skeleton className="h-screen" />}><History /></Suspense>} />
        <Route path="nutrition" element={<Nutrition />} />
        <Route path="classes" element={<Classes />} />
        <Route path="trainers" element={<Trainers />} />
        <Route path="membership" element={<Membership />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Suspense fallback={<Skeleton className="h-screen" />}><Notifications /></Suspense>} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="/admin" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Suspense fallback={<Skeleton className="h-screen" />}><Admin /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
