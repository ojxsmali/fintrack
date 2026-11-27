import { ToastContext, type Push, type ToastItem } from './toastContext'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Check, CircleAlert } from 'lucide-react'




export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const next = useRef(1)

  const push = useCallback<Push>((message, opts = {}) => {
    const id = next.current++
    setItems((xs) => [...xs.slice(-2), { id, message, tone: opts.tone ?? 'success', action: opts.action }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), opts.tone === 'error' ? 6000 : 3500)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-50 flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-full border-2 border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-paper shadow-[4px_4px_0_var(--color-accent)] animate-[ft-toast-in_var(--duration-base)_var(--ease-out)]"
          >
            {t.tone === 'success' ? <Check size={16} className="text-accent" aria-hidden /> : <CircleAlert size={16} className="text-tangerine" aria-hidden />}
            <span>{t.message}</span>
            {t.action && (
              <button className="ml-1 font-medium underline underline-offset-2" onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

