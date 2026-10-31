import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Droplets, Minus, Utensils, Coffee, Sun, Moon, Cookie, Settings2 } from 'lucide-react'
import { Bar, Button, Card, Empty, Field, Modal, PageHeader, Ring, DemoNote } from '../components/ui'
import { useToast } from '../context/toast'
import { dateKey } from '../utils/stats'
import { apiRequest } from '../utils/api'

const CATS = [['Breakfast', Coffee], ['Lunch', Sun], ['Dinner', Moon], ['Snacks', Cookie]]
const EMPTY = { name: '', cal: '', p: '', c: '', f: '', cat: 'Breakfast' }

function MealForm({ open, onClose, initial, onSave, foods, saving }) {
  const [f, setF] = useState(initial || EMPTY)
  const [errs, setErrs] = useState({})
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const pickFood = (id) => { const food = foods.find((x) => x.id === id); if (food) setF((x) => ({ ...x, name: food.name, cal: food.calories, p: food.protein, c: food.carbohydrates, f: food.fat })) }
  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!f.name.trim()) er.name = 'Enter a meal name.'
    const n = (k) => Number(f[k])
    if (f.cal === '' || !(n('cal') >= 0 && n('cal') <= 10000)) er.cal = 'Calories must be 0–10000.'
    ;['p', 'c', 'f'].forEach((k) => { if (f[k] !== '' && !(n(k) >= 0 && n(k) <= 1000)) er[k] = '0–1000 g' })
    setErrs(er)
    if (Object.keys(er).length) return
    onSave({ ...f, name: f.name.trim(), cal: n('cal'), p: n('p') || 0, c: n('c') || 0, f: n('f') || 0, servings: Number(f.servings) || 1 })
  }
  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit meal' : 'Add meal'}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Quick pick (illustrative values)"><select className="input" defaultValue="" onChange={(e) => pickFood(e.target.value)}><option value="">Choose a food…</option>{foods.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.calories} kcal / {x.serving_description}</option>)}</select></Field>
        <Field label="Meal name" error={errs.name}><input className="input" value={f.name} maxLength={100} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Servings"><input type="number" min="0.1" max="100" step="0.1" className="input" value={f.servings ?? 1} onChange={(e) => set('servings', e.target.value)} /></Field>
        <Field label="Category"><div className="grid grid-cols-4 gap-2">{CATS.map(([c]) => <button type="button" key={c} onClick={() => set('cat', c)} className={`min-h-[44px] rounded-xl text-xs font-medium border ${f.cat === c ? 'bg-brand text-[#101B2A] border-brand' : 'border-ink/10 text-mute'}`}>{c}</button>)}</div></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Calories (kcal)" error={errs.cal}><input inputMode="numeric" type="number" className="input" value={f.cal} onChange={(e) => set('cal', e.target.value)} /></Field><Field label="Protein (g)" error={errs.p}><input type="number" className="input" value={f.p} onChange={(e) => set('p', e.target.value)} /></Field><Field label="Carbs (g)" error={errs.c}><input type="number" className="input" value={f.c} onChange={(e) => set('c', e.target.value)} /></Field><Field label="Fat (g)" error={errs.f}><input type="number" className="input" value={f.f} onChange={(e) => set('f', e.target.value)} /></Field></div>
        <p className="text-xs text-mute">Sample foods use illustrative values only.</p>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Saving…' : initial?.id ? 'Save changes' : 'Add meal'}</Button>
      </form>
    </Modal>
  )
}

const Macro = ({ label, v, goal, color }) => (<div><div className="flex justify-between text-sm mb-1.5"><span>{label}</span><span className="text-mute text-xs">{Math.round(v)} / {goal} g</span></div><Bar value={v} max={goal} color={color} /></div>)

export default function Nutrition() {
  const toast = useToast()
  const date = dateKey()
  const [data, setData] = useState(null)
  const [foods, setFoods] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(null)
  const [tgt, setTgt] = useState(false)
  const [t, setT] = useState({ calories: 2200, protein: 150, carbohydrates: 250, fat: 70, water_ml: 2000 })
  const load = async () => {
    setError('')
    try {
      const [nutrition, foodList] = await Promise.all([apiRequest(`/nutrition?date=${date}`), apiRequest('/food-items')])
      setData(nutrition)
      setT(nutrition.targets)
      setFoods(foodList)
    } catch (issue) { setError(issue.message || 'Nutrition data could not be loaded.') }
  }
  useEffect(() => { load() }, [date])
  const meals = data?.entries || []
  const tot = useMemo(() => meals.reduce((a, m) => {
    const servings = Number(m.servings)
    return {
      cal: a.cal + Number(m.calories) * servings,
      p: a.p + Number(m.protein) * servings,
      c: a.c + Number(m.carbohydrates) * servings,
      f: a.f + Number(m.fat) * servings,
    }
  }, { cal: 0, p: 0, c: 0, f: 0 }), [meals])
  const T = { cal: Number(t.calories), p: Number(t.protein), c: Number(t.carbohydrates), f: Number(t.fat), water: Math.ceil(Number(t.water_ml) / 250) }
  const waterMl = data?.waterMl || 0
  const water = Math.floor(waterMl / 250)
  const remaining = T.cal - tot.cal

  const save = async (m) => {
    setBusy(true)
    try {
      const payload = { date, mealType: m.cat || m.meal_type, name: m.name, servings: m.servings, calories: m.cal, protein: m.p, carbohydrates: m.c, fat: m.f }
      if (m.id) await apiRequest(`/nutrition/entries/${m.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await apiRequest('/nutrition/entries', { method: 'POST', body: JSON.stringify(payload) })
      await load()
      setForm(null)
      toast(m.id ? 'Meal updated' : `${m.name} logged`)
    } catch (issue) { toast(issue.message || 'Meal could not be saved.', 'error') }
    finally { setBusy(false) }
  }
  const saveTargets = async () => {
    setBusy(true)
    try {
      const values = { calories: Number(t.calories), protein: Number(t.protein), carbohydrates: Number(t.carbohydrates), fat: Number(t.fat), waterMl: Number(t.water_ml) }
      const updated = await apiRequest('/nutrition/targets', { method: 'PUT', body: JSON.stringify(values) })
      setT(updated); setTgt(false); toast('Targets updated')
    } catch (issue) { toast(issue.message || 'Targets could not be saved.', 'error') }
    finally { setBusy(false) }
  }
  const addWater = async (delta) => {
    setBusy(true)
    try {
      if (delta > 0) await apiRequest('/nutrition/water', { method: 'POST', body: JSON.stringify({ date, amountMl: 250 }) })
      else await apiRequest(`/nutrition/water?date=${date}`, { method: 'DELETE' })
      await load()
    } catch (issue) { toast(issue.message || 'Water intake could not be saved.', 'error') }
    finally { setBusy(false) }
  }
  const removeMeal = async (id) => {
    try { await apiRequest(`/nutrition/entries/${id}`, { method: 'DELETE' }); await load(); toast('Meal removed', 'info') }
    catch (issue) { toast(issue.message || 'Meal could not be removed.', 'error') }
  }

  if (error && !data) return <Empty icon={Utensils} title="Nutrition unavailable" text={error} action={<Button onClick={load}>Try again</Button>} />
  if (!data) return <div className="space-y-4"><PageHeader eyebrow="Nutrition tracker" title="Fuel the work" /><Card className="h-48 animate-pulse" /></div>

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nutrition tracker" title="Fuel the work" sub={`Log meals and water for ${date}.`}><Button variant="ghost" onClick={() => { setT(data.targets); setTgt(true) }}><Settings2 size={16} />Targets</Button><Button onClick={() => setForm({ ...EMPTY, servings: 1 })}><Plus size={16} />Add meal</Button></PageHeader>
      <DemoNote>Targets are simple editable defaults, not medically personalized advice. Food values are illustrative.</DemoNote>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="flex flex-col sm:flex-row lg:flex-col items-center gap-6 justify-center">
          <Ring value={(tot.cal / T.cal) * 100} size={180} stroke={14}><span className="font-display text-4xl font-bold">{Math.round(tot.cal)}</span><span className="text-xs text-mute">of {T.cal} kcal</span></Ring>
          <div className="text-center sm:text-left lg:text-center"><p className={`font-display text-2xl font-bold ${remaining < 0 ? 'text-red-400' : 'text-gold'}`}>{Math.abs(Math.round(remaining))} kcal</p><p className="text-sm text-mute">{remaining < 0 ? 'over target' : 'remaining today'}</p></div>
        </Card>
        <Card className="space-y-5"><h2 className="font-bold">Daily macros</h2><Macro label="Protein" v={tot.p} goal={T.p} color="bg-brand" /><Macro label="Carbohydrates" v={tot.c} goal={T.c} color="bg-gold" /><Macro label="Fat" v={tot.f} goal={T.f} color="bg-sky-400" /></Card>
        <Card>
          <div className="flex items-center justify-between mb-3"><h2 className="font-bold flex items-center gap-2"><Droplets size={18} className="text-sky-400" />Water</h2><span className="text-sm text-mute">{waterMl} / {t.water_ml} ml</span></div>
          <div className="grid grid-cols-4 gap-2 mb-4">{[...Array(Math.max(T.water, water))].map((_, i) => <div key={i} className={`h-12 rounded-xl flex items-center justify-center transition ${i < water ? 'bg-sky-400/25 text-sky-400' : 'bg-ink/10 text-mute'}`}><Droplets size={18} /></div>)}</div>
          <div className="flex gap-2"><Button variant="ghost" size="sm" aria-label="Remove glass" disabled={waterMl === 0 || busy} onClick={() => addWater(-1)}><Minus size={16} /></Button><Button className="flex-1" size="sm" disabled={busy} onClick={() => addWater(1)}><Plus size={16} />Add 250 ml</Button></div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {CATS.map(([cat, Icon]) => { const items = meals.filter((m) => m.meal_type === cat); const sum = items.reduce((a, m) => a + Number(m.calories) * Number(m.servings), 0); return (
          <Card key={cat}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold flex items-center gap-2"><Icon size={18} className="text-brand" />{cat}</h3><div className="flex items-center gap-2"><span className="text-xs text-mute">{sum} kcal</span><button aria-label={`Add to ${cat}`} onClick={() => setForm({ ...EMPTY, cat })} className="p-2 rounded-lg bg-brand/15 text-brand"><Plus size={16} /></button></div></div>
            {items.length ? <ul className="space-y-2">{items.map((m) => <li key={m.id} className="flex items-center gap-2 rounded-xl bg-bg/50 px-3 py-2.5"><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{m.name}</p><p className="text-xs text-mute">{m.calories} kcal · P{m.protein} C{m.carbohydrates} F{m.fat} · {m.servings} serving(s)</p></div><button aria-label={`Edit ${m.name}`} onClick={() => setForm({ id: m.id, name: m.name, cal: m.calories, p: m.protein, c: m.carbohydrates, f: m.fat, cat: m.meal_type, servings: m.servings })} className="p-2 text-mute hover:text-ink"><Pencil size={15} /></button><button aria-label={`Delete ${m.name}`} onClick={() => removeMeal(m.id)} className="p-2 text-mute hover:text-red-400"><Trash2 size={15} /></button></li>)}</ul>
              : <p className="text-sm text-mute py-3">Nothing logged yet.</p>}
          </Card>
        )})}
      </div>
      {!meals.length && <Empty icon={Utensils} title="No meals logged today" text="Add your first meal to see daily totals." />}

      {form && <MealForm key={form.id || form.cat + 'new'} open onClose={() => setForm(null)} initial={form} onSave={save} foods={foods} saving={busy} />}
      <Modal open={tgt} onClose={() => setTgt(false)} title="Daily targets">
        <div className="grid grid-cols-2 gap-3">{[['calories', 'Calories (kcal)'], ['protein', 'Protein (g)'], ['carbohydrates', 'Carbs (g)'], ['fat', 'Fat (g)'], ['water_ml', 'Water (ml)']].map(([k, l]) => <Field key={k} label={l}><input type="number" className="input" value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} /></Field>)}</div>
        <p className="text-xs text-mute my-4">These are your own editable targets — not medical advice.</p>
        <Button className="w-full" disabled={busy} onClick={saveTargets}>Save targets</Button>
      </Modal>
    </div>
  )
}
