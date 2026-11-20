import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'

/**
 * Native <dialog> gives us focus trapping, Esc-to-close, inert background and
 * correct screen-reader semantics for free. Two presentations share it:
 * 'modal' (centered) and 'drawer' (right panel on desktop, bottom sheet on mobile).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'modal',
  size = 'sm',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  variant?: 'modal' | 'drawer'
  size?: 'sm' | 'md'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const frame =
    variant === 'drawer'
      ? 'm-0 ml-auto mt-auto md:mt-0 h-[92dvh] md:h-dvh max-h-none w-full md:w-[440px] max-w-full rounded-t-lg md:rounded-none md:border-l animate-[ft-sheet-in_var(--duration-base)_var(--ease-out)] md:animate-[ft-drawer-in_var(--duration-base)_var(--ease-out)]'
      : `m-auto w-[calc(100%-2rem)] ${size === 'md' ? 'max-w-lg' : 'max-w-md'} rounded-lg animate-[ft-fade-in_var(--duration-base)_var(--ease-out)]`

  return (
    <dialog
      ref={ref}
      // Only user-initiated closes (Esc, backdrop, X) call onClose. Programmatic
      // close() from the `open` prop must not, or swapping dialogs resets state.
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // backdrop click
      }}
      aria-labelledby={titleId}
      className={`bg-surface text-ink border-line p-0 shadow-[var(--shadow-overlay)] backdrop:bg-ink/30 ${frame}`}
    >
      {open && (
        <div className={`flex flex-col ${variant === 'drawer' ? 'h-full' : 'max-h-[85dvh]'}`}>
          <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 md:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold tracking-[-0.01em]">
                {title}
              </h2>
              {description && <div className="mt-1 text-sm text-ink-3">{description}</div>}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1.5 shrink-0">
              <X size={18} />
            </IconButton>
          </header>
          <div className="flex-1 overflow-y-auto px-5 pb-5 md:px-6">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
