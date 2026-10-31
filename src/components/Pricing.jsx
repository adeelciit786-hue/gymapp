import { useState } from 'react'
import { Check } from 'lucide-react'
import { PLANS } from '../data/trainers'
import { Button, Chip } from './ui'

export const YEARLY_DISCOUNT = 20
export const priceOf = (p, billing) => (billing === 'yearly' ? Math.round(p.price * (1 - YEARLY_DISCOUNT / 100)) : p.price)

export default function Pricing({ selected, onSelect, plans = PLANS, showBilling = true }) {
  const [billing, setBilling] = useState(selected?.billing || 'monthly')
  return (
    <div>
      {showBilling && <div className="flex flex-col items-center gap-2 mb-10">
        <div className="flex gap-2 glass p-1.5 rounded-full">
          <Chip active={billing === 'monthly'} onClick={() => setBilling('monthly')}>Monthly</Chip>
          <Chip active={billing === 'yearly'} onClick={() => setBilling('yearly')}>Yearly · save {YEARLY_DISCOUNT}%</Chip>
        </div>
        <p className="text-xs text-mute">Demo pricing & discount for illustration. No payment is processed.</p>
      </div>}
      <div className="grid md:grid-cols-3 gap-5 items-stretch">
        {plans.map((p) => {
          const isSel = selected?.plan === p.id
          return (
            <div key={p.id} className={`relative surface p-7 flex flex-col lift ${p.pop ? 'md:-translate-y-3 !border-brand/60 shadow-glow' : ''}`}>
              {p.pop && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-[#101B2A] text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">Most Popular</span>}
              <h3 className="font-display text-2xl font-bold tracking-widest uppercase">{p.name}</h3>
              <p className="text-mute text-sm">{p.tag}</p>
              <div className="my-6 flex items-baseline gap-1.5">
                <span className="text-xs text-mute">AED</span>
                <span className="font-display text-5xl font-bold">{priceOf(p, billing)}</span>
                <span className="text-mute text-sm">/month</span>
              </div>
              {billing === 'yearly' && <p className="text-xs text-gold -mt-4 mb-4">Billed AED {priceOf(p, billing) * 12}/yr · was AED {p.price * 12}</p>}
              <ul className="space-y-3 flex-1 mb-7">
                {p.feats.map((f) => <li key={f} className="flex gap-2.5 text-sm"><Check size={17} className="text-brand shrink-0 mt-0.5" />{f}</li>)}
              </ul>
              <Button variant={p.pop ? 'primary' : 'ghost'} onClick={() => onSelect(p, billing)} disabled={isSel && selected?.billing === billing}>
                {isSel && selected?.billing === billing ? 'Current selection' : `Choose ${p.name}`}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
