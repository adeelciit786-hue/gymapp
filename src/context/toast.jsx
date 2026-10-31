import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'

const Ctx = createContext(null)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef({})
  const dismiss = useCallback((id) => { clearTimeout(timers.current[id]); setItems((l) => l.filter((t) => t.id !== id)) }, [])
  const toast = useCallback((msg, kind = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setItems((l) => [...l.slice(-3), { id, msg, kind }])
    timers.current[id] = setTimeout(() => dismiss(id), 3800)
  }, [dismiss])
  const Icon = { success: CheckCircle2, info: Info, error: AlertTriangle }
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="fixed z-[100] left-0 right-0 bottom-24 lg:bottom-6 lg:left-auto lg:right-6 flex flex-col items-center lg:items-end gap-2 px-4 pointer-events-none" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const I = Icon[t.kind] || Info
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} className="glass pointer-events-auto flex items-center gap-3 rounded-2xl pl-4 pr-2 py-3 shadow-2xl max-w-sm w-full lg:w-auto">
                <I size={20} className={t.kind === 'error' ? 'text-red-400' : t.kind === 'info' ? 'text-gold' : 'text-brand'} />
                <p className="text-sm flex-1">{t.msg}</p>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="p-2 text-mute hover:text-ink"><X size={16} /></button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
export const useToast = () => useContext(Ctx)
