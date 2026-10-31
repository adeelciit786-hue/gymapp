import { useEffect, useState } from 'react'
import Pricing from '../components/Pricing'
import { Button, Card, Empty, PageHeader, Skeleton } from '../components/ui'
import { useToast } from '../context/toast'
import { apiRequest } from '../utils/api'

export default function Membership() {
  const toast = useToast()
  const [plans, setPlans] = useState([])
  const [membership, setMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([apiRequest('/membership-plans'), apiRequest('/memberships/me')])
      .then(([available, current]) => {
        if (!active) return
        setPlans(available.map((plan) => ({ ...plan, price: Number(plan.price), tag: plan.description, feats: plan.features })))
        setMembership(current)
      })
      .catch((issue) => { if (active) setError(issue.message || 'Membership plans are unavailable.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const inquire = async (plan) => {
    if (busy) return
    setBusy(true)
    try {
      const current = await apiRequest('/membership-inquiries', { method: 'POST', body: JSON.stringify({ planId: plan.id }) })
      setMembership({ ...current, plan_name: plan.name, price: plan.price, billing_period: plan.billing_period })
      toast('Membership inquiry submitted. No payment has been taken.')
    } catch (issue) { toast(issue.message || 'Membership inquiry could not be submitted.', 'error') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="space-y-5"><Skeleton className="h-14 w-2/3" /><Skeleton className="h-64" /></div>
  if (error) return <Empty title="Membership plans unavailable" text={error} action={<Button onClick={() => window.location.reload()}>Try again</Button>} />

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Membership" title="Choose your tier" sub="Plans are illustrative. Inquiries do not collect payment or activate paid membership." />
      {membership && <Card className="!border-brand/50"><p className="eyebrow mb-1">{membership.status === 'active' ? 'Current membership' : 'Inquiry status'}</p><p className="font-display text-2xl font-bold uppercase">{membership.plan_name} <span className="text-mute text-base normal-case">· {membership.status}</span></p><p className="text-xs text-mute mt-2">Illustrative plan pricing only. No payment has been processed.</p></Card>}
      <Pricing
        plans={plans}
        selected={membership ? { plan: membership.plan_id, billing: membership.billing_period } : null}
        showBilling={false}
        onSelect={(plan) => inquire(plan)}
      />
      <p className="text-xs text-mute text-center">Illustrative pricing for demonstration only. FORGE. has not represented these as official commercial prices.</p>
    </div>
  )
}
