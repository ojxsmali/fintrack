import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

const control =
  'w-full h-10 rounded-sm border bg-surface px-3 text-base sm:text-sm text-ink placeholder:text-ink-4 transition-colors duration-[var(--duration-fast)] hover:border-ink-4 focus:outline-none focus-visible:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:bg-sunken disabled:text-ink-3'

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  optional?: boolean
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode
  className?: string
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, error, hint, optional, children, className = '' }: FieldProps) {
  const id = useId()
  const descId = `${id}-desc`
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-3">(optional)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error || hint ? descId : undefined })}
      {error ? (
        <p id={descId} className="text-xs text-negative" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { prefix?: string }>(function Input(
  { className = '', prefix, ...rest },
  ref,
) {
  const invalid = rest['aria-invalid'] ? 'border-negative' : 'border-line-strong'
  if (prefix) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-sm">{prefix}</span>
        <input ref={ref} className={`${control} ${invalid} pl-7 ${className}`} {...rest} />
      </div>
    )
  }
  return <input ref={ref} className={`${control} ${invalid} ${className}`} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', children, ...rest },
  ref,
) {
  const invalid = rest['aria-invalid'] ? 'border-negative' : 'border-line-strong'
  return (
    <div className={`relative ${className}`}>
      <select ref={ref} className={`${control} ${invalid} appearance-none pr-9`} {...rest}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = '', ...rest },
  ref,
) {
  const invalid = rest['aria-invalid'] ? 'border-negative' : 'border-line-strong'
  return <textarea ref={ref} className={`${control} ${invalid} h-auto min-h-20 py-2 resize-y ${className}`} {...rest} />
})

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {description && <p className="text-sm text-ink-3 mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-[var(--duration-base)] disabled:opacity-50 ${checked ? 'bg-accent' : 'bg-line-strong'}`}
      >
        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  )
}

/** Password input with a show/hide toggle (keeps autocomplete + label wiring). */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input ref={ref} {...props} type={visible ? 'text' : 'password'} className={`pr-16 ${props.className ?? ''}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xs px-2 py-1 text-xs font-medium text-ink-3 hover:bg-sunken hover:text-ink"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
})
