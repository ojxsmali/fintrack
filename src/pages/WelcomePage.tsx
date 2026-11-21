import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight, ChartNoAxesColumn, Download, Hand, LayoutDashboard, Lightbulb, ShieldCheck, Target } from 'lucide-react'
import { Wordmark } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { CurrencySelect } from '../components/ui/CurrencySelect'
import { AuthorCredit } from '../components/layout/AuthorCredit'
import { CountUp, Reveal, SplitWords } from '../components/motion/Motion'
import { Magnetic, PullCard, TiltCard } from '../components/motion/Interactive'
import { spotlight } from '../components/motion/effects'
import { useAuth, type Workspace } from '../services/authContext'
import { buildHeroPreview, type HeroPreview } from '../lib/heroPreview'
import { formatCurrency, formatPercent } from '../lib/format'
import { AUTHOR } from '../lib/brand'

const STACK = ['React 19', 'TypeScript', 'TanStack Query', 'Recharts', 'Supabase · Postgres RLS', 'motion', 'Vitest']
const MARQUEE = ['Monthly overview', 'Spending pace', 'Budgets that warn at 80%', 'Insights with the working shown', 'Trends across months', 'CSV export', 'Every ISO currency', 'Press N to add', 'Private by default']

const inr = (n: number) => formatCurrency(Math.round(n), 'INR')

export function WelcomePage() {
  const { status, hasBackend, startWorkspace } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [pending, setPending] = useState<Workspace | null>(null)
  const preview = useMemo(() => buildHeroPreview(), [])

  if (status === 'signedIn') return <Navigate to="/dashboard" replace />

  const open = async (kind: Workspace) => {
    setPending(kind)
    await startWorkspace(kind, kind === 'own' ? name : '', currency)
    navigate('/dashboard')
  }

  return (
    <div className="ft-grain relative flex min-h-dvh flex-col overflow-x-clip">
      <Ambient />

      {/* Floating glass nav */}
      <header className="sticky top-3 z-40 mx-auto mt-3 w-[calc(100%-1.5rem)] max-w-[1200px]">
        <div className="flex items-center justify-between rounded-full border border-white/10 bg-[#101412]/70 py-2 pl-4 pr-2 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl">
          <Wordmark />
          <nav aria-label="Welcome" className="flex items-center gap-1 text-sm">
            <a href="#features" className="hidden rounded-full px-3 py-2 font-medium text-ink-2 transition-colors hover:bg-white/5 hover:text-ink sm:inline-block">Features</a>
            <a href="#product" className="hidden rounded-full px-3 py-2 font-medium text-ink-2 transition-colors hover:bg-white/5 hover:text-ink md:inline-block">Product</a>
            {AUTHOR.repoUrl && (
              <a href={AUTHOR.repoUrl} target="_blank" rel="noreferrer" className="hidden rounded-full px-3 py-2 font-medium text-ink-2 transition-colors hover:bg-white/5 hover:text-ink sm:inline-block">GitHub</a>
            )}
            {hasBackend && <Link to="/login" className="rounded-full px-3 py-2 font-medium text-ink-2 hover:text-ink">Sign in</Link>}
            <Magnetic strength={0.25}>
              <a href="#start" className="ft-press inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 font-semibold text-on-accent transition-[transform,background-color] duration-300 ease-[var(--ease-spring)] hover:bg-accent-hover">
                Get started <ArrowUpRight size={15} aria-hidden />
              </a>
            </Magnetic>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[1200px] flex-1 px-5 sm:px-8">
        {/* Hero */}
        <section className="grid items-center gap-14 pb-16 pt-14 md:pt-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10 lg:pb-24 lg:pt-24">
          <div>
            <p className="ft-page inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-ink-2">
              <span className="ft-live size-1.5 rounded-full bg-accent text-accent" aria-hidden="true" />
              Live prototype · no sign-up needed
            </p>
            <h1 className="mt-6 font-display text-[3.1rem] font-bold leading-[0.95] tracking-[-0.055em] text-ink sm:text-[5.4rem]">
              <SplitWords text="Where your money goes," /> <span className="ft-highlight"><SplitWords text="and what’s changing." stagger={70} /></span>
            </h1>
            <p className="ft-page mt-7 max-w-lg text-lg leading-relaxed text-ink-2 [animation-delay:500ms]">
              FinTrack turns everyday transactions into a clear monthly picture — what you earn, what you spend, and what deserves your attention.
            </p>
            <div className="ft-page mt-9 flex flex-col gap-3 [animation-delay:620ms] sm:flex-row sm:items-center">
              <Magnetic>
                <Button size="lg" loading={pending === 'sample'} onClick={() => open('sample')} className="group w-full !rounded-full sm:w-auto">
                  Open the prototype <ArrowRight size={17} aria-hidden className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover:translate-x-1" />
                </Button>
              </Magnetic>
              <a href="#start" className="ft-press inline-flex h-12 items-center justify-center rounded-full border border-line-strong px-6 font-medium text-ink transition-colors hover:border-ink-3 hover:bg-white/5">
                Start your own
              </a>
            </div>
            <dl className="ft-page mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6 [animation-delay:760ms]">
              {[
                [preview.transactionCount, 'sample transactions'],
                [13, 'months of history'],
                [6, 'screens, all working'],
              ].map(([n, l]) => (
                <div key={l as string}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="num font-display text-3xl font-semibold tracking-[-0.04em] text-ink"><CountUp value={n as number} format={(v) => String(Math.round(v))} /></dd>
                  <dd className="mt-1 text-xs text-ink-3">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <CardStack p={preview} />
        </section>

        {/* Marquee */}
        <div className="ft-marquee-wrap relative -mx-5 overflow-hidden border-y border-line py-5 sm:-mx-8 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]" aria-hidden="true">
          <div className="ft-marquee gap-10">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-2xl font-semibold tracking-[-0.03em] text-ink-3">
                {m} <span className="size-2 rounded-full bg-accent" />
              </span>
            ))}
          </div>
        </div>

        <ScrollShowcase />
        <Bento p={preview} />
        <Start
          pending={pending}
          open={open}
          name={name}
          setName={setName}
          currency={currency}
          setCurrency={setCurrency}
          hasBackend={hasBackend}
        />

        <Reveal as="section" aria-label="Built with" className="mt-24 border-t border-line pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">Built with</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {STACK.map((s) => (
              <li key={s} className="rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-sm text-ink-2 transition-colors hover:border-accent hover:text-ink">{s}</li>
            ))}
          </ul>
        </Reveal>
      </main>

      <footer className="relative mt-20 border-t border-line">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-5 py-8 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <AuthorCredit />
          <p>Guest workspaces stay in your browser. Accounts are protected by row-level security.</p>
        </div>
      </footer>
    </div>
  )
}

/** Two slow lime/teal orbs that drift with scroll. */
function Ambient() {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 1200], [0, 260])
  const y2 = useTransform(scrollY, [0, 1200], [0, -180])
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
      <div className="ft-grid-bg absolute inset-x-0 top-0 h-[900px]" />
      <motion.div style={{ y: y1 }} className="ft-orb -right-40 -top-40 size-[620px] bg-[#c6f45e]/[0.13]" />
      <motion.div style={{ y: y2 }} className="ft-orb -left-60 top-[420px] size-[520px] bg-[#3fd6c0]/[0.08]" />
    </div>
  )
}

/** The hero's fanned cards — all real figures from the prototype's sample data. Grab one: it springs back. */
function CardStack({ p }: { p: HeroPreview }) {
  const W = 300
  const H = 90
  const max = Math.max(1, ...p.pace.map((d) => Math.max(d.current ?? 0, d.previous ?? 0)))
  const x = (day: number) => ((day - 1) / Math.max(1, p.pace.length - 1)) * W
  const y = (v: number) => H - (v / max) * (H - 8) - 4
  const path = (key: 'current' | 'previous') =>
    p.pace
      .filter((d) => d[key] !== null)
      .map((d, i) => `${i ? 'L' : 'M'}${x(d.day).toFixed(1)},${y(d[key] as number).toFixed(1)}`)
      .join(' ')
  const curr = p.pace.filter((d) => d.current !== null)
  const last = curr[curr.length - 1]
  const prevSame = p.pace.find((d) => d.day === last?.day)?.previous ?? null
  const pace = last && prevSame ? ((last.current! - prevSame) / prevSame) * 100 : null

  return (
    <div className="relative mx-auto h-[540px] w-full max-w-[520px] sm:h-[560px]" role="group" aria-label={`Sample overview for ${p.monthName}`}>
      <p className="ft-page absolute -top-2 right-2 z-40 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#101412]/80 px-3 py-1.5 text-xs text-ink-2 backdrop-blur [animation-delay:1400ms]">
        <Hand size={13} aria-hidden className="text-accent" /> Grab a card — it springs back
      </p>

      {/* Saved this month — the lime card */}
      <PullCard rotate={-6} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, type: 'spring', stiffness: 140, damping: 18 }}
        className="absolute left-0 top-6 z-20 w-[64%] sm:w-[58%]">
        <div className="rounded-lg bg-accent p-5 text-on-accent shadow-[0_30px_60px_-24px_rgb(198_244_94/0.5)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">Saved in {p.monthName}</p>
          <p className="num mt-3 font-display text-[2.4rem] font-bold leading-none tracking-[-0.05em]"><CountUp value={Math.abs(p.net)} format={inr} /></p>
          {p.savingsRate !== null && <p className="mt-3 text-sm font-medium opacity-75">{formatPercent(p.savingsRate, { digits: 0 })} of income kept</p>}
        </div>
      </PullCard>

      {/* Spending pace */}
      <PullCard rotate={4} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 140, damping: 18 }}
        className="absolute right-0 top-[190px] z-30 w-[86%] sm:w-[80%]">
        <div className="rounded-lg border border-white/10 bg-[#161b18]/95 p-5 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Spending pace</p>
            {pace !== null && (
              <span className={`num rounded-full px-2 py-0.5 text-xs font-semibold ${pace <= 0 ? 'bg-positive-soft text-positive' : 'bg-caution-soft text-caution'}`}>
                {pace <= 0 ? '↓' : '↑'} {formatPercent(Math.abs(pace), { digits: 0 })} vs {p.prevMonthName}
              </span>
            )}
          </div>
          <p className="num mt-1 text-xs text-ink-3">{inr(p.expense)} spent by day {last?.day}</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-24 w-full overflow-visible" role="img" aria-label={`Cumulative spending: ${inr(last?.current ?? 0)} by day ${last?.day ?? 0}, dashed line is ${p.prevMonthName}.`}>
            <defs>
              <linearGradient id="ft-pace" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#c6f45e" stopOpacity=".28" />
                <stop offset="1" stopColor="#c6f45e" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={path('previous')} fill="none" stroke="#5d6761" strokeWidth="1.6" strokeDasharray="4 4" />
            {last && <path d={`${path('current')} L${x(last.day)},${H} L0,${H} Z`} fill="url(#ft-pace)" className="ft-page [animation-delay:1200ms]" />}
            <path d={path('current')} pathLength={1} className="ft-draw" fill="none" stroke="#c6f45e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {last && <circle cx={x(last.day)} cy={y(last.current ?? 0)} r="4.5" fill="#c6f45e" stroke="#161b18" strokeWidth="2.5" className="ft-page [animation-delay:1700ms]" />}
          </svg>
        </div>
      </PullCard>

      {/* Where it went */}
      <PullCard rotate={-3} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, type: 'spring', stiffness: 140, damping: 18 }}
        className="absolute bottom-0 left-[4%] z-20 w-[78%] sm:w-[68%]">
        <div className="rounded-lg border border-white/10 bg-[#121614]/95 p-5 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur">
          <p className="text-sm font-semibold text-ink">Where it went</p>
          <ul className="mt-4 grid gap-3">
            {p.topCategories.map((c, i) => (
              <li key={c.name} className="grid grid-cols-[76px_1fr_36px] items-center gap-3 text-xs">
                <span className="truncate text-ink-2">{c.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <span className="ft-grow block h-full rounded-full bg-accent" style={{ width: `${Math.max(4, c.share)}%`, animationDelay: `${900 + i * 110}ms`, opacity: 1 - i * 0.18 }} />
                </span>
                <span className="num text-right text-ink-3">{formatPercent(c.share, { digits: 0 })}</span>
              </li>
            ))}
          </ul>
        </div>
      </PullCard>
    </div>
  )
}

/** The real overview, rising from a tilt and scaling to full size as you scroll (container-scroll effect). */
function ScrollShowcase() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1])
  const y = useTransform(scrollYProgress, [0, 1], [60, 0])
  return (
    <section id="product" aria-labelledby="product-title" className="scroll-mt-24 pt-24 lg:pt-32">
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold text-accent">The product</p>
        <h2 id="product-title" className="mt-3 font-display text-4xl font-bold leading-[1] tracking-[-0.045em] text-ink sm:text-6xl">
          One calm screen for the whole month.
        </h2>
      </Reveal>
      <div ref={ref} className="mt-14 [perspective:1400px]">
        <motion.figure style={{ rotateX, scale, y }} className="origin-top">
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-surface p-1.5 shadow-[0_60px_120px_-40px_rgb(0_0_0/0.95),0_0_0_1px_rgb(198_244_94/0.06)]">
            <img
              src="/preview/overview-1600.webp"
              srcSet="/preview/overview-960.webp 960w, /preview/overview-1600.webp 1600w"
              sizes="(min-width: 1200px) 1136px, 100vw"
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full rounded-[16px]"
              alt="The FinTrack overview: total balance, this month's income, spending and savings, a spending-pace chart against last month, and insights worth your attention."
            />
          </div>
        </motion.figure>
      </div>
    </section>
  )
}

const KEYS = ['N']

/** Feature bento: each tile shows the feature doing its job, with a cursor spotlight. */
function Bento({ p }: { p: HeroPreview }) {
  const budget = 84
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24 pt-28 lg:pt-36">
      <Reveal>
        <p className="text-sm font-semibold text-accent">What it does</p>
        <h2 id="features-title" className="mt-3 max-w-2xl font-display text-4xl font-bold leading-[1] tracking-[-0.045em] text-ink sm:text-6xl">
          Built around the questions you actually ask.
        </h2>
      </Reveal>
      <ul className="mt-12 grid auto-rows-[minmax(220px,auto)] gap-3 md:grid-cols-6">
        <Tile className="md:col-span-4" icon={LayoutDashboard} title="A calm monthly overview" body="Balance, income, spending and savings — and how this month compares with the last, day for day.">
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[['Income', p.income], ['Spent', p.expense], ['Saved', p.net]].map(([l, v]) => (
              <div key={l as string} className="rounded-md border border-line bg-paper/60 p-3">
                <p className="text-2xs text-ink-3">{l}</p>
                <p className={`num mt-1 font-display text-lg font-semibold tracking-[-0.03em] ${l === 'Saved' ? 'text-positive' : 'text-ink'}`}>{inr(v as number)}</p>
              </div>
            ))}
          </div>
        </Tile>
        <Tile className="md:col-span-2" icon={Target} title="Budgets that warn early" body="Flagged at 80%, before the month is gone.">
          <div className="mt-6">
            <div className="flex justify-between text-xs"><span className="text-ink-2">Transport</span><span className="num text-caution">{budget}% used</span></div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div className="h-full rounded-full bg-caution" initial={{ width: 0 }} whileInView={{ width: `${budget}%` }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.2 }} />
            </div>
            <p className="mt-2 text-2xs text-ink-3">Example budget, close to its limit</p>
          </div>
        </Tile>
        <Tile className="md:col-span-2" icon={Lightbulb} title="Insights with the working shown" body="Every insight is calculated from your own numbers. Tap to see the formula.">
          <details className="group mt-5 rounded-md border border-line bg-paper/60 p-3 text-xs">
            <summary className="cursor-pointer list-none font-medium text-ink">Spending pace ↓ — show basis</summary>
            <p className="mt-2 text-ink-3">(Spent 1st→today − same days last month) ÷ same days last month × 100</p>
          </details>
        </Tile>
        <Tile className="md:col-span-2" icon={ChartNoAxesColumn} title="Trends across months" body="Income against spending, savings rate, busiest weekday and largest expenses.">
          <div className="mt-6 flex h-16 items-end gap-1.5">
            {[42, 64, 51, 78, 58, 88, 70].map((h, i) => (
              <motion.span key={i} className="flex-1 rounded-t-[4px] bg-accent/80" initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 120, damping: 12, delay: i * 0.06 }} />
            ))}
          </div>
          <p className="mt-2 text-2xs text-ink-3">Illustrative shape</p>
        </Tile>
        <Tile className="md:col-span-2" icon={Download} title="Fast, and yours to export" body="Press N anywhere to add a transaction. Export everything to CSV.">
          <div className="mt-6 flex items-center gap-2">
            {KEYS.map((k) => (
              <motion.kbd key={k} whileHover={{ y: 3, boxShadow: '0 1px 0 #3a423e' }} whileTap={{ y: 4, boxShadow: '0 0 0 #3a423e' }}
                className="grid size-12 cursor-pointer place-items-center rounded-md border border-line-strong bg-sunken font-mono text-lg font-semibold text-ink shadow-[0_4px_0_#3a423e]">
                {k}
              </motion.kbd>
            ))}
            <span className="text-xs text-ink-3">→ add transaction</span>
          </div>
        </Tile>
        <Tile className="md:col-span-6" icon={ShieldCheck} title="Private by default" body="Guest workspaces never leave your browser. Synced accounts are isolated by Postgres row-level security, checked by 20 automated database tests.">
          <ul className="mt-6 flex flex-wrap gap-2 text-xs">
            {['Guest data stays in this browser', 'Row-level security on every table', '20 automated RLS checks', 'No tracking, no ads'].map((c) => (
              <li key={c} className="rounded-full border border-line-strong bg-paper/60 px-3 py-1.5 text-ink-2">{c}</li>
            ))}
          </ul>
        </Tile>
      </ul>
    </section>
  )
}

function Tile({ className = '', icon: Icon, title, body, children }: { className?: string; icon: typeof Target; title: string; body: string; children?: React.ReactNode }) {
  return (
    <Reveal as="li" className={className}>
      <TiltCard className="h-full" max={4}>
        <div onPointerMove={spotlight} className="ft-card group flex h-full flex-col rounded-lg border border-line bg-surface p-6">
          <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-110">
            <Icon size={19} aria-hidden />
          </span>
          <h3 className="mt-5 font-display text-xl font-semibold tracking-[-0.03em] text-ink">{title}</h3>
          <p className="mt-1.5 text-sm text-ink-3">{body}</p>
          {children}
        </div>
      </TiltCard>
    </Reveal>
  )
}

function Start({
  pending,
  open,
  name,
  setName,
  currency,
  setCurrency,
  hasBackend,
}: {
  pending: Workspace | null
  open: (k: Workspace) => void
  name: string
  setName: (s: string) => void
  currency: string
  setCurrency: (s: string) => void
  hasBackend: boolean
}) {
  return (
    <section id="start" aria-labelledby="start-title" className="scroll-mt-24 pt-28 lg:pt-36">
      <Reveal className="text-center">
        <h2 id="start-title" className="font-display text-5xl font-bold tracking-[-0.05em] text-ink sm:text-7xl">Two ways in.</h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-2">Look around with a year of realistic data, or start a private workspace of your own. Both run entirely in your browser.</p>
      </Reveal>
      <div className="mt-12 grid gap-3 md:grid-cols-2">
        <Reveal>
          <div onPointerMove={spotlight} className="ft-card ft-lift flex h-full flex-col rounded-lg border border-line bg-surface p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">Option 1</p>
            <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">See the prototype</h3>
            <p className="mt-3 text-sm text-ink-2">Every screen with a year of realistic sample data — dashboard, budgets, analytics and insights. Nothing to set up.</p>
            <ul className="mt-6 grid gap-2.5 text-sm text-ink-2">
              {['13 months of income and spending', 'Five category budgets with live progress', 'Insights you can check the working of'].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="grid size-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-on-accent" aria-hidden>✓</span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <Button size="lg" variant="secondary" className="w-full !rounded-full sm:w-auto" loading={pending === 'sample'} onClick={() => open('sample')}>
                Open the prototype <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </div>
        </Reveal>
        <Reveal delay={90}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              open('own')
            }}
            onPointerMove={spotlight}
            className="ft-card ft-lift relative flex h-full flex-col overflow-hidden rounded-lg border border-accent/40 bg-[linear-gradient(160deg,#1a2214,#131715_55%)] p-7 sm:p-9"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Option 2</p>
            <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">Build your own FinTrack</h3>
            <p className="mt-3 text-sm text-ink-2">Start from zero and track your own income, spending and budgets. Saved privately in this browser — no sign-up.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="What should we call you?" optional>
                {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} placeholder="Your first name" />}
              </Field>
              <Field label="Currency">{(p) => <CurrencySelect {...p} value={currency} onChange={(e) => setCurrency(e.target.value)} />}</Field>
            </div>
            <div className="mt-auto pt-8">
              <Button type="submit" size="lg" className="w-full !rounded-full sm:w-auto" loading={pending === 'own'}>
                Start tracking <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </form>
        </Reveal>
      </div>
      {hasBackend && (
        <p className="mt-5 text-center text-sm text-ink-3">
          Want it on every device?{' '}
          <Link to="/signup" className="font-medium text-accent underline-offset-2 hover:underline">Create a free account</Link> or{' '}
          <Link to="/login" className="font-medium text-accent underline-offset-2 hover:underline">sign in</Link>.
        </p>
      )}
    </section>
  )
}
