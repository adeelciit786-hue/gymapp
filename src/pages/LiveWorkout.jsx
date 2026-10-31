import { Navigate, useSearchParams } from 'react-router-dom'
import SavedLiveWorkout from './SavedLiveWorkout'

export default function LiveWorkout() {
  const [params] = useSearchParams()
  const workoutId = params.get('workout')
  if (!workoutId) return <Navigate to="/app/planner" replace />
  return <SavedLiveWorkout workoutId={workoutId} />
}
