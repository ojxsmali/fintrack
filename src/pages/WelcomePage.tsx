import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, ChartNoAxesColumn, Keyboard, LayoutDashboard, Lightbulb, ShieldCheck, Target } from 'lucide-react'
import { Wordmark } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { CurrencySelect } from '../components/ui/CurrencySelect'
import { AuthorCredit } from '../components/layout/AuthorCredit'
import { CountUp, Reveal, SplitWords } from '../components/motion/Motion'
import { useReducedMotion } from '../components/motion/useReducedMotion'
import { useAuth, type Workspace } from '../services/authContext'
import { buildHeroPreview, type HeroPreview } from '../lib/heroPreview'
import { formatCurrency, formatPercent } from '../lib/format'
import { AUTHOR } from '../lib/brand'

const FEATURES = [
  { icon: LayoutDashboard, title: 'A calm monthly overview', body: 'Balance, income, spending and savings — and how this month compares with the last, day for day.' },
  { icon: Target, title: 'Budgets that warn early', body: 'Monthly limits per category, flagged at 80% so you can change course before the month is gone.' },
  { icon: Lightbulb, title: 'Insights with the working shown', body: 'Every insight is calculated from your own numbers, and one tap reveals the basis behind it.' },
  { icon: ChartNoAxesColumn, title: 'Trends across months', body: 'Income against spending, savings rate, your busiest weekday and largest expenses over any period.' },
  { icon: Keyboard, title: 'Fast to keep up to date', body: 'Press N anywhere to add a transaction. Search, filter and sort the full history in a click.' },
  { icon: ShieldCheck, title: 'Yours, and private', body: 'Guest workspaces never leave your browser. Synced accounts are isolated by row-level security.' },
] as const

const STACK = ['React 19', 'TypeScript', 'TanStack Query', 'Recharts', 'Supabase · Postgres RLS', 'Vitest']

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
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <div className="ft-aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="ft-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[720px]" aria-hidden="true" />

      <header className="relative mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <nav aria-label="Welcome" className="flex items-center gap-1 text-sm">
          <a href="#features" className="hidden rounded-sm px-3 py-2 font-medium text-ink-2 hover:bg-sunken hover:text-ink sm:inline-block">
            Features
          </a>
          {AUTHOR.repoUrl && (
            <a href={AUTHOR.repoUrl} target="_blank" rel="noreferrer" className="hidden rounded-sm px-3 py-2 font-medium text-ink-2 hover:bg-sunken hover:text-ink sm:inline-block">
              GitHub
            </a>
          )}
          {hasBackend && (
            <Link to="/login" className="rounded-sm px-3 py-2 font-medium text-ink-2 hover:bg-sunken hover:text-ink">
              Sign in
            </Link>
          )}
          <a href="#start" className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-sm bg-ink px-3.5 font-medium text-paper transition-colors hover:bg-[#33322e]">
            Get started
          </a>
        </nav>
      </header>

      <main className="relative mx-auto w-full max-w-[1200px] flex-1 px-5 pb-20 sm:px-8">
        {/* Hero */}
        <section className="grid items-center gap-12 pt-8 md:pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:pt-20">
          <div>
            <p className="ft-page inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-medium text-ink-2 backdrop-blur-sm">
              <span className="ft-live size-1.5 rounded-full bg-positive text-positive" aria-hidden="true" />
              Live prototype · no sign-up needed
            </p>
            <h1 className="mt-5 font-display text-[2.75rem] leading-[1.02] tracking-[-0.015em] text-ink sm:text-[4.25rem]">
              <SplitWords text="Where your money goes, and what’s changing." />
            </h1>
            <p className="ft-page mt-6 max-w-xl text-lg text-ink-2 [animation-delay:450ms]">
              FinTrack turns everyday transactions into a clear monthly picture — what you earn, what you spend, and what deserves your attention.
            </p>
            <div className="ft-page mt-8 flex flex-col gap-3 [animation-delay:560ms] sm:flex-row sm:items-center">
              <Button size="lg" loading={pending === 'sample'} onClick={() => open('sample')} className="group">
                Open the prototype <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
              </Button>
              <a href="#start" className="inline-flex h-11 items-center justify-center rounded-sm px-4 text-base font-medium text-ink-2 hover:bg-sunken hover:text-ink">
                or start your own
              </a>
            </div>
            <p className="ft-page mt-4 text-sm text-ink-3 [animation-delay:640ms]">
              {preview.transactionCount} sample transactions across 13 months · every screen works
            </p>
          </div>

          <HeroCard p={preview} />
        </section>

        {/* Product preview */}
        <TiltPreview />

        {/* Features */}
        <section id="features" aria-labelledby="features-title" className="mt-24 scroll-mt-8">
          <Reveal>
            <p className="text-sm font-medium text-accent">What it does</p>
            <h2 id="features-title" className="mt-2 max-w-2xl font-display text-4xl leading-[1.08] tracking-[-0.01em] text-ink sm:text-5xl">
              Built around the questions you actually ask about money.
            </h2>
          </Reveal>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal as="li" key={f.title} delay={(i % 3) * 80} className="group bg-surface p-6 transition-colors hover:bg-[#fffefb] sm:p-7">
                <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent transition-transform duration-300 group-hover:-translate-y-0.5">
                  <f.icon size={19} aria-hidden />
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-[-0.01em] text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm text-ink-3">{f.body}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* Get started */}
        <section id="start" aria-labelledby="start-title" className="mt-24 scroll-mt-8">
          <Reveal>
            <h2 id="start-title" className="font-display text-4xl leading-[1.08] tracking-[-0.01em] text-ink sm:text-5xl">
              Two ways in.
            </h2>
            <p className="mt-3 max-w-xl text-base text-ink-2">Look around with a year of realistic data, or start a private workspace of your own. Both run entirely in your browser.</p>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Reveal className="ft-card ft-lift flex flex-col rounded-lg border border-line bg-surface p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">Option 1</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em]">See the prototype</h3>
              <p className="mt-2 text-sm text-ink-2">
                Explore every screen with a year of realistic sample data — dashboard, budgets, analytics and insights. Nothing to set up.
              </p>
              <ul className="mt-5 grid gap-2 text-sm text-ink-2">
                {['13 months of income and spending', 'Five category budgets with live progress', 'Insights you can check the working of'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="size-1 rounded-full bg-accent" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-7">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto" loading={pending === 'sample'} onClick={() => open('sample')}>
                  Open the prototype <ArrowRight size={16} aria-hidden />
                </Button>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  open('own')
                }}
                className="ft-card ft-lift flex h-full flex-col rounded-lg border border-ink bg-surface p-6 sm:p-8"
              >
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-accent">Option 2</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em]">Build your own FinTrack</h3>
                <p className="mt-2 text-sm text-ink-2">
                  Start from zero and track your own income, spending and budgets. Saved privately in this browser — no sign-up needed.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="What should we call you?" optional>
                    {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} placeholder="Your first name" />}
                  </Field>
                  <Field label="Currency">
                    {(p) => <CurrencySelect {...p} value={currency} onChange={(e) => setCurrency(e.target.value)} />}
                  </Field>
                </div>
                <div className="mt-auto pt-6">
                  <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending === 'own'}>
                    Start tracking <ArrowRight size={16} aria-hidden />
                  </Button>
                </div>
              </form>
            </Reveal>
          </div>

          {hasBackend && (
            <p className="mt-5 text-sm text-ink-3">
              Want it on every device?{' '}
              <Link to="/signup" className="font-medium text-accent underline-offset-2 hover:underline">
                Create a free account
              </Link>{' '}
              or{' '}
              <Link to="/login" className="font-medium text-accent underline-offset-2 hover:underline">
                sign in
              </Link>
              .
            </p>
          )}
        </section>

        <Reveal as="section" aria-label="Built with" className="mt-20 border-t border-line pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">Built with</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {STACK.map((s) => (
              <li key={s} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-2">
                {s}
              </li>
            ))}
          </ul>
        </Reveal>
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-5 py-6 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <AuthorCredit />
          <p>Guest workspaces stay in your browser. Accounts are protected by row-level security.</p>
        </div>
      </footer>
    </div>
  )
}

/** A working slice of the overview, computed from the prototype's own sample data. */
function HeroCard({ p }: { p: HeroPreview }) {
  const inr = (n: number) => formatCurrency(Math.round(n), 'INR')
  const W = 320
  const H = 96
  const max = Math.max(1, ...p.pace.map((d) => Math.max(d.current ?? 0, d.previous ?? 0)))
  const x = (day: number) => ((day - 1) / Math.max(1, p.pace.length - 1)) * W
  const y = (v: number) => H - (v / max) * (H - 6) - 3
  const line = (key: 'current' | 'previous') =>
    p.pace
      .filter((d) => d[key] !== null)
      .map((d, i) => `${i ? 'L' : 'M'}${x(d.day).toFixed(1)},${y(d[key] as number).toFixed(1)}`)
      .join(' ')
  const curr = p.pace.filter((d) => d.current !== null)
  const last = curr[curr.length - 1]

  return (
    <figure className="ft-page relative [animation-delay:250ms]" aria-label={`Sample overview for ${p.monthName}`}>
      <div className="absolute -inset-3 -z-10 rounded-[20px] bg-gradient-to-br from-accent-soft via-transparent to-positive-soft opacity-80 blur-xl" aria-hidden="true" />
      <div className="rounded-xl border border-line bg-surface/95 p-5 shadow-[0_30px_70px_-34px_rgba(26,26,24,0.35)] backdrop-blur-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">This month</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">{p.monthName}</p>
          </div>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-2xs font-medium text-accent">Sample data</span>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-4">
          {[
            ['Income', p.income, 'text-ink'],
            ['Spent', p.expense, 'text-ink'],
            [p.net >= 0 ? 'Saved' : 'Overspent', Math.abs(p.net), p.net >= 0 ? 'text-positive' : 'text-negative'],
          ].map(([label, v, tone]) => (
            <div key={label as string} className="min-w-0">
              <dt className="text-xs text-ink-3">{label}</dt>
              <dd className={`num mt-1 truncate text-lg font-medium tracking-[-0.02em] sm:text-xl ${tone}`}>
                <CountUp value={v as number} format={inr} />
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-ink-2">Spending pace</span>
            <span className="flex items-center gap-3 text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded bg-chart-current" aria-hidden /> {p.monthName}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0 w-3 border-t-2 border-dashed border-chart-previous" aria-hidden /> {p.prevMonthName}
              </span>
            </span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-24 w-full overflow-visible" role="img" aria-label={`Cumulative spending by day: ${inr(last?.current ?? 0)} by day ${last?.day ?? 0} of ${p.monthName}.`}>
            {[0.33, 0.66].map((g) => (
              <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="var(--color-line)" strokeWidth="1" />
            ))}
            <path d={line('previous')} fill="none" stroke="var(--color-chart-previous)" strokeWidth="1.75" strokeDasharray="4 4" />
            <path d={line('current')} pathLength={1} className="ft-draw" fill="none" stroke="var(--color-chart-current)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
            {last && <circle cx={x(last.day)} cy={y(last.current ?? 0)} r="3.5" fill="var(--color-chart-current)" stroke="#fdfcf9" strokeWidth="2" className="ft-page [animation-delay:1500ms]" />}
          </svg>
        </div>

        <ul className="mt-5 grid gap-2.5" aria-label="Top categories">
          {p.topCategories.map((c, i) => (
            <li key={c.name} className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-xs">
              <span className="truncate text-ink-2">{c.name}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-sunken">
                <span className="ft-grow block h-full rounded-full bg-accent" style={{ width: `${Math.max(4, c.share)}%`, animationDelay: `${500 + i * 90}ms` }} />
              </span>
              <span className="num text-ink-3">{formatPercent(c.share, { digits: 0 })}</span>
            </li>
          ))}
        </ul>
        {p.savingsRate !== null && (
          <p className="mt-5 rounded-md bg-sunken/70 px-3 py-2 text-xs text-ink-2">
            Savings rate so far: <strong className="num font-semibold text-ink">{formatPercent(p.savingsRate, { digits: 0 })}</strong> of income kept.
          </p>
        )}
      </div>
    </figure>
  )
}

/** The full overview screenshot, tilted back and flattening as it scrolls into view. */
function TiltPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const t = Math.min(1, Math.max(0, (r.top - vh * 0.15) / (vh * 0.7)))
      el.style.setProperty('--tilt', t.toFixed(3))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <figure className="mt-20 lg:mt-28">
      <div ref={ref} className="ft-tilt overflow-hidden rounded-xl border border-line bg-surface shadow-[0_40px_90px_-40px_rgba(26,26,24,0.4)]">
        <div className="flex items-center gap-1.5 border-b border-line bg-sunken px-3 py-2" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="ml-3 hidden rounded-sm bg-surface px-2 py-0.5 text-2xs text-ink-3 sm:inline">fintrack-ojasmali.vercel.app/dashboard</span>
        </div>
        <img
          src="/preview/overview-1600.webp"
          srcSet="/preview/overview-960.webp 960w, /preview/overview-1600.webp 1600w"
          sizes="(min-width: 1200px) 1136px, 100vw"
          width={1600}
          height={1000}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
          alt="The FinTrack overview: total balance, this month's income, spending and savings, a spending-pace chart against last month, and insights worth your attention."
        />
      </div>
      <figcaption className="mt-4 text-sm text-ink-3">
        The prototype’s overview — balance, this month at a glance, spending pace and the insights worth a look.
      </figcaption>
    </figure>
  )
}
