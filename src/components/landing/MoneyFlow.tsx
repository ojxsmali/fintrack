import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { HeroPreview } from '../../lib/heroPreview'
import { formatCurrency, formatPercent } from '../../lib/format'

/**
 * The landing page's signature figure: this month's money in (left) splitting into
 * where it went (right), ribbon widths proportional to the real sample figures.
 * Lime marks the one ribbon that matters most — what you kept.
 * The legend is the accessible source of truth; ribbons are presentation.
 */
type Node = { key: string; name: string; amount: number; tone: 'kept' | 'out' | 'over' }

const W = 600
const H = 400
const BAR = 10
const GAP = 14
/** The inflow bar is drawn shorter than the outflows so the ribbons fan out. */
const SQUEEZE = 0.46

const inr = (n: number) => formatCurrency(Math.round(n), 'INR')

export function MoneyFlow({ p }: { p: HeroPreview }) {
  const { nodes, left, total } = useMemo(() => {
    const cats = p.topCategories.filter((c) => c.amount > 0)
    const rest = Math.max(0, p.expense - cats.reduce((s, c) => s + c.amount, 0))
    const out: Node[] = cats.map((c) => ({ key: c.name, name: c.name, amount: c.amount, tone: 'out' }))
    if (rest > 0) out.push({ key: 'rest', name: 'Everything else', amount: rest, tone: 'out' })
    if (p.net > 0) out.push({ key: 'kept', name: 'Kept', amount: p.net, tone: 'kept' })
    const inflow = [{ name: 'Income', amount: p.income }]
    if (p.net < 0) inflow.push({ name: 'From savings', amount: -p.net })
    return { nodes: out, left: inflow, total: out.reduce((s, n) => s + n.amount, 0) }
  }, [p])

  const [active, setActive] = useState<string>(nodes.some((n) => n.key === 'kept') ? 'kept' : (nodes[0]?.key ?? ''))
  const [hovering, setHovering] = useState(false)

  const geo = useMemo(() => {
    const avail = H - GAP * Math.max(0, nodes.length - 1)
    const k = total > 0 ? avail / total : 0
    const lk = k * SQUEEZE
    let ly = (H - total * lk) / 2
    let ry = 0
    const x0 = BAR
    const x1 = W - BAR
    const mid = W * 0.52
    const out: (Node & { ly0: number; ly1: number; ry0: number; ry1: number; d: string })[] = []
    for (const n of nodes) {
      const h = n.amount * k
      const lh = n.amount * lk
      const a = { ly0: ly, ly1: ly + lh, ry0: ry, ry1: ry + h }
      ly += lh
      ry += h + GAP
      const d = `M${x0},${a.ly0} C${mid},${a.ly0} ${mid},${a.ry0} ${x1},${a.ry0} L${x1},${a.ry1} C${mid},${a.ry1} ${mid},${a.ly1} ${x0},${a.ly1} Z`
      out.push({ ...n, ...a, d })
    }
    return out
  }, [nodes, total])

  const leftBars = useMemo(() => {
    const k = total > 0 ? ((H - GAP * Math.max(0, nodes.length - 1)) / total) * SQUEEZE : 0
    let y = (H - total * k) / 2
    const out: { name: string; amount: number; y: number; h: number }[] = []
    for (const l of left) {
      const h = l.amount * k
      out.push({ ...l, y, h })
      y += h
    }
    return out
  }, [left, nodes.length, total])

  const current = geo.find((g) => g.key === active) ?? geo[0]
  const greyOpacity = [0.34, 0.27, 0.21, 0.16, 0.12]

  const fillFor = (g: (typeof geo)[number], i: number) => {
    const on = g.key === active
    if (g.tone === 'kept') return { fill: 'var(--color-accent)', opacity: on ? 0.95 : 0.3 }
    return { fill: 'var(--color-ink)', opacity: on ? 0.78 : (greyOpacity[i] ?? 0.12) * (hovering ? 0.7 : 1) }
  }

  return (
    <figure className="min-w-0" aria-labelledby="flow-caption">
      <div className="flex items-baseline justify-between gap-4 border-t border-ink/80 pt-3">
        <figcaption id="flow-caption" className="ft-label text-ink-2">
          Fig. 1 — {p.monthName} so far, sample month
        </figcaption>
        <span className="ft-label hidden sm:inline">Money in → where it went</span>
      </div>

      {/* Readout of the active ribbon */}
      <div className="mt-6 flex min-h-[5.5rem] flex-wrap items-end justify-between gap-x-6 gap-y-2" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={current?.key}
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <p className="ft-label">{current?.tone === 'kept' ? 'Kept this month' : current?.name}</p>
            <p className={`num ft-display mt-2 text-[2.6rem] sm:text-[3.4rem] ${current?.tone === 'kept' ? 'text-accent' : 'text-ink'}`}>
              {current ? inr(current.amount) : '—'}
            </p>
          </motion.div>
        </AnimatePresence>
        <p className="num pb-1 font-mono text-xs text-ink-3">
          {current && p.income > 0 ? `${formatPercent((current.amount / p.income) * 100, { digits: 0 })} of ${inr(p.income)} income` : ''}
        </p>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:items-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full overflow-visible"
          aria-hidden="true"
          onPointerLeave={() => setHovering(false)}
        >
          <defs>
            <clipPath id="ft-flow-clip">
              <rect className="ft-flow-reveal" x="0" y="-20" width={W} height={H + 40} />
            </clipPath>
          </defs>
          <g clipPath="url(#ft-flow-clip)">
            {geo.map((g, i) => {
              const f = fillFor(g, i)
              return (
                <path
                  key={g.key}
                  d={g.d}
                  className="ft-ribbon"
                  fill={f.fill}
                  fillOpacity={f.opacity}
                  onPointerEnter={() => {
                    setHovering(true)
                    setActive(g.key)
                  }}
                  onClick={() => setActive(g.key)}
                />
              )
            })}
            {geo.map((g) => (
              <rect key={g.key} x={W - BAR} y={g.ry0} width={BAR} height={Math.max(1, g.ry1 - g.ry0)} fill={g.tone === 'kept' ? 'var(--color-accent)' : 'var(--color-ink)'} opacity={g.key === active ? 1 : 0.55} />
            ))}
          </g>
          {leftBars.map((l, i) => (
            <rect key={l.name} x="0" y={l.y} width={BAR} height={l.h} fill="var(--color-ink)" opacity={i === 0 ? 1 : 0.4} />
          ))}
        </svg>

        <ol className="grid border-t border-line" aria-label={`Where ${inr(p.income)} of income went in ${p.monthName}`}>
          {geo.map((g, i) => {
            const on = g.key === active
            return (
              <li key={g.key} className="border-b border-line">
                <button
                  type="button"
                  aria-pressed={on}
                  onPointerEnter={() => setActive(g.key)}
                  onFocus={() => setActive(g.key)}
                  onClick={() => setActive(g.key)}
                  className={`ft-flow-row ft-press grid w-full grid-cols-[2rem_0.6rem_minmax(0,1fr)_auto] items-center gap-3 px-1 py-2.5 text-left text-sm ${on ? 'bg-sunken text-ink' : 'text-ink-2 hover:text-ink'}`}
                >
                  <span className="font-mono text-2xs text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                  <span aria-hidden className={`h-2.5 w-2.5 rounded-[2px] ${g.tone === 'kept' ? 'bg-accent' : 'bg-ink'}`} style={g.tone === 'kept' ? undefined : { opacity: Math.max(0.25, greyOpacity[i] ?? 0.2) + 0.2 }} />
                  <span className={`truncate font-medium ${g.tone === 'kept' ? 'text-accent' : ''}`}>{g.name}</span>
                  <span className="num font-mono text-xs">{inr(g.amount)}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </figure>
  )
}
