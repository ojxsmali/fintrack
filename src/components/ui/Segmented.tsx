import { useRef, type KeyboardEvent } from 'react'

interface Option<T extends string> {
  value: T
  label: string
}

/** Radio-group semantics with arrow-key navigation. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className = '',
}: {
  value: T
  onChange: (v: T) => void
  options: Option<T>[]
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (i + dir + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-sm bg-sunken p-0.5 ${className}`}>
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={`flex-1 rounded-[5px] font-medium transition-colors duration-[var(--duration-fast)] ${size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-4 text-sm'} ${
              active ? 'bg-surface text-ink shadow-[var(--shadow-raise)]' : 'text-ink-3 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
