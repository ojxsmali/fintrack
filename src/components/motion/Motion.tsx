/**
 * Small, source-owned motion primitives (no animation library). Every effect is
 * progressive: without IntersectionObserver / requestAnimationFrame, or when the
 * visitor asks for reduced motion, content renders in its final state at once.
 */
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { useReducedMotion } from './useReducedMotion'

/** Fades + lifts its children into place the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
}: {
  children: ReactNode
  delay?: number
  as?: ElementType
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const canObserve = typeof window !== 'undefined' && 'IntersectionObserver' in window
  const [shown, setShown] = useState(!canObserve || reduced)

  useEffect(() => {
    if (shown || !ref.current) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [shown])

  return (
    <Tag ref={ref} data-reveal={shown ? 'in' : 'out'} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties} className={className}>
      {children}
    </Tag>
  )
}

/**
 * Headline that rises in word by word. The full sentence stays in the DOM as
 * one text run for screen readers; the animated words are presentation only.
 */
export function SplitWords({ text, className = '', stagger = 55 }: { text: string; className?: string; stagger?: number }) {
  const words = text.split(' ')
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <Fragment key={i}>
            <span className="ft-word-mask">
              <span className="ft-word" style={{ animationDelay: `${120 + i * stagger}ms` }}>
                {w}
              </span>
            </span>
            {i < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </span>
  )
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

/**
 * Counts a figure up from zero when it first appears. `format` turns the
 * in-between values into display text (currency, percent…). The settled value
 * is always what screen readers and tests see.
 */
export function CountUp({
  value,
  format,
  duration = 1100,
  className = '',
}: {
  value: number
  format: (n: number) => string
  duration?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const animate = !reduced && typeof window !== 'undefined' && 'IntersectionObserver' in window && 'requestAnimationFrame' in window
  const ref = useRef<HTMLSpanElement>(null)
  const [done, setDone] = useState(!animate)

  useEffect(() => {
    if (!animate || !ref.current) return
    const el = ref.current
    let raf = 0
    let start = 0
    const tick = (ts: number) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / duration)
      el.textContent = format(value * easeOutExpo(p))
      if (p < 1) raf = requestAnimationFrame(tick)
      else setDone(true)
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect()
        raf = requestAnimationFrame(tick)
      }
    })
    el.textContent = format(0)
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
    // value/format changes re-run the count; format is usually an inline closure, so key on value only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, animate, duration])

  if (done) return <span className={className}>{format(value)}</span>
  return (
    <span className={className}>
      <span className="sr-only">{format(value)}</span>
      <span ref={ref} aria-hidden="true">
        {format(value)}
      </span>
    </span>
  )
}
