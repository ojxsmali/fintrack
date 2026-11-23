import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ripple } from '../motion/effects'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

// Press feels physical: a quick squash on pointer-down, a spring back on release, and an ink ripple from the touch point.
const base =
  'ft-press relative isolate inline-flex items-center justify-center gap-2 overflow-hidden font-medium whitespace-nowrap select-none rounded-sm ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-spring)] ' +
  'disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink-3 hover:bg-sunken',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink',
  danger: 'bg-negative text-on-accent hover:brightness-110',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading, className = '', children, disabled, type = 'button', onPointerDown, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onPointerDown={(e) => {
        ripple(e)
        onPointerDown?.(e)
      }}
      {...rest}
    >
      {loading ? <span className="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

export function IconButton({
  label,
  className = '',
  children,
  onPointerDown,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => {
        ripple(e)
        onPointerDown?.(e)
      }}
      className={`ft-press relative isolate inline-grid size-10 place-items-center overflow-hidden rounded-sm text-ink-2 transition-[background-color,color,transform] duration-[var(--duration-base)] ease-[var(--ease-spring)] hover:bg-sunken hover:text-ink ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
