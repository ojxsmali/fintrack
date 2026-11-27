import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight, Hand, MousePointerClick } from 'lucide-react'
import { Wordmark } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { CurrencySelect } from '../components/ui/CurrencySelect'
import { AuthorCredit } from '../components/layout/AuthorCredit'
import { Reveal, SplitWords } from '../components/motion/Motion'
import { Magnetic, PullCard } from '../components/motion/Interactive'
import { useReducedMotion } from '../components/motion/useReducedMotion'
import { MoneyStacks3D, type StackDatum } from '../components/three/Scene3D'
import { useAuth, type Workspace } from '../services/authContext'
import { buildHeroPreview, type HeroPreview } from '../lib/heroPreview'
import { formatCurrency, formatPercent } from '../lib/format'
import { AUTHOR } from '../lib/brand'

const STACK = ['React 19', 'TypeScript', 'three.js · react-three-fiber', 'TanStack Query', 'Recharts', 'Supabase · Postgres RLS', 'motion', 'Vitest']

const inr = (n: number) => formatCurrency(Math.round(n), 'INR')

/** Page frame shared by every landing section: wide measure, fluid gutter. */
const FRAME = 'mx-auto w-full max-w-[1360px] px-[clamp(16px,3vw,40px)]'

const PUSH = 'ft-press ft-push inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[transform,box-shadow,background-color] duration-200 ease-[var(--ease-spring)]'

export function WelcomePage() {
  const { status, workspace, hasBackend, startWorkspace } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [pending, setPending] = useState<Workspace | null>(null)
  const preview = useMemo(() => buildHeroPreview(), [])

  // Synced accounts go straight to their dashboard; guest workspaces can still come back here.
  if (status === 'signedIn' && !workspace) return <Navigate to="/dashboard" replace />

  const open = async (kind: Workspace) => {
    setPending(kind)
    await startWorkspace(kind, kind === 'own' ? name : '', currency)
    navigate('/dashboard')
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <a href="#hero" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xs focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur-md">
        <div className={`${FRAME} flex h-16 items-center justify-between gap-4`}>
          <Link to="/" aria-label="FinTrack home" className="rounded-xs">
            <Wordmark />
          </Link>
          <nav aria-label="Welcome" className="flex items-center gap-1 text-sm">
            <NavA href="#features" className="hidden md:inline-flex">Features</NavA>
            <NavA href="#privacy" className="hidden md:inline-flex">Privacy</NavA>
            <Link to="/brand" className="hidden h-9 items-center rounded-xs px-3 font-medium text-ink-2 transition-colors hover:text-ink lg:inline-flex">
              Brand kit
            </Link>
            {AUTHOR.repoUrl && (
              <NavA href={AUTHOR.repoUrl} external className="hidden sm:inline-flex">
                GitHub
              </NavA>
            )}
            {hasBackend && !workspace && (
              <Link to="/login" className="inline-flex h-9 items-center rounded-xs px-3 font-semibold text-ink hover:underline">
                Log in
              </Link>
            )}
            <Magnetic strength={0.25}>
              {workspace ? (
                <Link to="/dashboard" className={`${PUSH} ml-1 h-10 bg-accent px-4 text-on-accent hover:bg-accent-hover`}>
                  Your dashboard <ArrowUpRight size={15} aria-hidden />
                </Link>
              ) : hasBackend ? (
                <Link to="/signup" className={`${PUSH} ml-1 h-10 bg-accent px-4 text-on-accent hover:bg-accent-hover`}>
                  Create account <ArrowUpRight size={15} aria-hidden />
                </Link>
              ) : (
                <a href="#start" className={`${PUSH} ml-1 h-10 bg-accent px-4 text-on-accent hover:bg-accent-hover`}>
                  Get started <ArrowUpRight size={15} aria-hidden />
                </a>
              )}
            </Magnetic>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Hero preview={preview} pending={pending} open={open} hasBackend={hasBackend} />
        <Ticker p={preview} />
        <ScrollShowcase />
        <Features p={preview} />
        <Privacy />
        <Start pending={pending} open={open} name={name} setName={setName} currency={currency} setCurrency={setCurrency} hasBackend={hasBackend} />
      </main>

      <footer className="mt-28 border-t-2 border-ink bg-surface">
        <div className={`${FRAME} grid gap-10 py-12 md:grid-cols-12`}>
          <div className="md:col-span-5">
            <Wordmark />
            <p className="mt-4 max-w-sm text-sm text-ink-3">Guest mode saves nothing. Accounts are protected by Postgres row-level security.</p>
            <AuthorCredit className="mt-6 text-sm text-ink-3" />
          </div>
          <div className="md:col-span-4">
            <p className="ft-label">Built with</p>
            <ul className="mt-3 grid gap-1 font-mono text-xs text-ink-2">
              {STACK.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-3">
            <p className="ft-label">Identity</p>
            <ul className="mt-3 grid gap-1 text-sm text-ink-2">
              <li className="font-display font-bold">Unbounded</li>
              <li>Geist</li>
              <li className="font-mono text-xs">JetBrains Mono</li>
            </ul>
            <Link to="/brand" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-accent decoration-[3px] underline-offset-4 hover:decoration-ink">
              Open the brand kit <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ───────────────────────── Hero ───────────────────────── */

const TONES: StackDatum['tone'][] = ['cobalt', 'tangerine', 'cream', 'ink']
const DOT: Record<StackDatum['tone'], string> = {
  gold: 'bg-accent',
  cobalt: 'bg-cobalt',
  tangerine: 'bg-tangerine',
  cream: 'bg-[#f4ead2]',
  ink: 'bg-ink',
}

function Hero({ preview, pending, open, hasBackend }: { preview: HeroPreview; pending: Workspace | null; open: (k: Workspace) => void; hasBackend: boolean }) {
  const reduced = useReducedMotion()
  const stacks = useMemo<StackDatum[]>(
    () => [
      { name: 'Kept', amount: Math.max(preview.net, 0), label: inr(Math.max(preview.net, 0)), tone: 'gold' },
      ...preview.topCategories.map((c, i) => ({ name: c.name, amount: c.amount, label: inr(c.amount), tone: TONES[i % TONES.length] })),
    ],
    [preview],
  )
  const [selected, setSelected] = useState(0)
  const pick = stacks[selected]
  const shareOfIncome = preview.income > 0 ? pick.amount / preview.income : null

  return (
    <section id="hero" aria-labelledby="hero-title" className={`${FRAME} pb-16 pt-8 sm:pt-12 lg:pb-24`}>
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6 xl:col-span-6">
          <p className="ft-page inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink shadow-[3px_3px_0_#16140f]">
            <span className="ft-live size-2 rounded-full bg-positive text-positive" aria-hidden="true" />
            Try it as a guest · no sign-up
          </p>
          <h1 id="hero-title" className="ft-display mt-7 text-[clamp(2.7rem,9.6vw,6.6rem)] text-ink lg:text-[clamp(3rem,4.9vw,5.4rem)]">
            <SplitWords text="Your money," />
            <br />
            <span className="ft-serif">
              <SplitWords text="stacked up." stagger={90} />
            </span>
          </h1>
          <p className="ft-page mt-7 max-w-lg text-lg leading-relaxed text-ink-2 [animation-delay:450ms] sm:text-xl sm:leading-relaxed">
            FinTrack turns every rupee in and out into something you can actually see: what you earn, where it goes, and how much you kept.
          </p>
          <div className="ft-page mt-9 flex flex-col gap-3 [animation-delay:560ms] sm:flex-row">
            <Magnetic>
              <button type="button" onClick={() => open('sample')} disabled={pending !== null} aria-busy={pending === 'sample' || undefined} className={`${PUSH} group h-14 w-full bg-accent px-7 text-base text-on-accent hover:bg-accent-hover sm:w-auto`}>
                {pending === 'sample' && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
                Continue as guest <ArrowRight size={18} aria-hidden className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover:translate-x-1" />
              </button>
            </Magnetic>
            {hasBackend ? (
              <Link to="/signup" className={`${PUSH} h-14 bg-surface px-7 text-base text-ink hover:bg-sunken`}>
                Create account
              </Link>
            ) : (
              <a href="#start" className={`${PUSH} h-14 bg-surface px-7 text-base text-ink hover:bg-sunken`}>
                Start your own
              </a>
            )}
          </div>
          {hasBackend && (
            <p className="ft-page mt-4 text-sm text-ink-3 [animation-delay:620ms]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2 hover:decoration-ink">
                Log in
              </Link>
              <span className="mx-2 text-ink-4">·</span>Guest mode saves nothing.
            </p>
          )}
          <dl className="ft-page mt-10 grid grid-cols-2 gap-3 [animation-delay:680ms] sm:grid-cols-4">
            <Fact term="Transactions" value={String(preview.transactionCount)} />
            <Fact term="Months" value="13" />
            <Fact term="Currencies" value="All ISO" />
            <Fact term="Sign-up" value="Optional" />
          </dl>
        </div>

        {/* The 3D figure */}
        <figure className="ft-page relative [animation-delay:200ms] lg:col-span-6">
          <div className="relative overflow-hidden rounded-[28px] border-2 border-ink bg-[radial-gradient(circle_at_50%_35%,#fff8df_0%,#efe4c6_70%)] shadow-[8px_8px_0_#16140f]">
            <div className="flex items-center justify-between border-b-2 border-ink bg-surface px-4 py-2.5">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">Fig. 1 · {preview.monthName}, in coins</span>
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-3 rounded-full border-2 border-ink bg-tangerine" />
                <span className="size-3 rounded-full border-2 border-ink bg-accent" />
                <span className="size-3 rounded-full border-2 border-ink bg-cobalt" />
              </span>
            </div>
            <MoneyStacks3D data={stacks} selected={selected} onPick={setSelected} calm={reduced} className="h-[380px] sm:h-[460px] lg:h-[520px]" fallback={<FlatStacks data={stacks} selected={selected} onPick={setSelected} />} />
            <p className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-paper">
              <span className="inline-flex items-center gap-1">
                <Hand size={12} aria-hidden /> Drag to spin
              </span>
              <span className="text-accent">·</span>
              <span className="inline-flex items-center gap-1">
                <MousePointerClick size={12} aria-hidden /> Tap a stack
              </span>
            </p>
          </div>

          {/* Readout: real buttons, so the figure works without a mouse or WebGL */}
          <figcaption className="mt-5">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a stack">
              {stacks.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                  className={`ft-press inline-flex items-center gap-2 rounded-full border-2 border-ink px-3 py-1.5 text-sm font-semibold transition-[background-color,color,transform,box-shadow] duration-200 ${
                    selected === i ? 'bg-ink text-paper shadow-none' : 'bg-surface text-ink shadow-[2px_2px_0_#16140f] hover:-translate-y-0.5'
                  }`}
                >
                  <span className={`size-2.5 rounded-full border border-ink ${DOT[s.tone]}`} aria-hidden />
                  {s.name}
                </button>
              ))}
            </div>
            <div aria-live="polite" className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <motion.span key={pick.name} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }} className="num font-display text-4xl font-extrabold tracking-[-0.04em] text-ink sm:text-5xl">
                {pick.label}
              </motion.span>
              <span className="text-sm text-ink-3">
                {pick.name === 'Kept' ? 'kept' : `on ${pick.name.toLowerCase()}`} in {preview.monthName}
                {shareOfIncome !== null && ` · ${formatPercent(shareOfIncome * 100, { digits: 0 })} of ${inr(preview.income)} income`}
              </span>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

/** Flat fallback when WebGL isn't available: the same stacks as 2D coin columns. */
function FlatStacks({ data, selected, onPick }: { data: StackDatum[]; selected: number; onPick: (i: number) => void }) {
  const max = Math.max(...data.map((d) => d.amount), 1)
  return (
    <div className="flex h-[380px] items-end justify-center gap-4 px-6 pb-16 sm:h-[460px] lg:h-[520px]" aria-hidden>
      {data.map((d, i) => {
        const n = Math.max(2, Math.round((d.amount / max) * 14))
        return (
          <button key={d.name} type="button" tabIndex={-1} onClick={() => onPick(i)} className="flex flex-col-reverse items-center">
            {Array.from({ length: n }, (_, k) => (
              <span key={k} className={`-mt-2.5 h-5 w-14 rounded-[50%] border-2 border-ink ${DOT[d.tone]} ${selected === i ? '-translate-y-2' : ''} transition-transform`} />
            ))}
          </button>
        )
      })}
    </div>
  )
}

/* ───────────────────────── Ticker ───────────────────────── */

function Ticker({ p }: { p: HeroPreview }) {
  const items = [
    `${inr(p.income)} in`,
    `${inr(p.expense)} out`,
    `${inr(p.net)} kept`,
    `${formatPercent(p.savingsRate, { digits: 0 })} savings rate`,
    ...p.topCategories.map((c) => `${c.name} ${inr(c.amount)}`),
  ]
  const row = (
    <div className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-6 pr-6 font-display text-2xl font-extrabold uppercase tracking-[-0.02em] sm:text-3xl">
          <span className={i % 3 === 2 ? 'text-accent' : 'text-paper'}>{t}</span>
          <span className="inline-block size-4 rounded-full border-2 border-paper bg-accent" aria-hidden />
        </span>
      ))}
    </div>
  )
  return (
    <section aria-label={`${p.monthName} at a glance`} className="-rotate-1 border-y-2 border-ink bg-ink py-4">
      <p className="sr-only">{items.join(', ')}</p>
      <div className="flex w-max ft-marquee" aria-hidden>
        {row}
        {row}
      </div>
    </section>
  )
}

/* ───────────────────────── Sections ───────────────────────── */

function NavA({ href, external, className = '', children }: { href: string; external?: boolean; className?: string; children: ReactNode }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={`h-9 items-center rounded-xs px-3 font-medium text-ink-2 transition-colors hover:text-ink ${className}`}
    >
      {children}
    </a>
  )
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="rounded-[14px] border-2 border-ink bg-surface px-3 py-2.5">
      <dt className="ft-label">{term}</dt>
      <dd className="num mt-1 font-display text-lg font-extrabold tracking-[-0.03em] text-ink">{value}</dd>
    </div>
  )
}

/** Sticker section marker + oversized headline. */
function SectionHead({ index, label, id, children, aside, invert }: { index: string; label: string; id: string; children: ReactNode; aside?: ReactNode; invert?: boolean }) {
  return (
    <Reveal>
      <div className="flex items-center justify-between gap-4">
        <p className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] ${invert ? 'border-paper text-paper' : 'border-ink bg-surface text-ink'}`}>
          <span className={`grid size-5 place-items-center rounded-full text-[10px] ${invert ? 'bg-accent text-ink' : 'bg-ink text-accent'}`}>{index}</span>
          {label}
        </p>
        {aside}
      </div>
      <h2 id={id} className="ft-display mt-7 max-w-[16ch] text-[clamp(2.3rem,5.6vw,5.2rem)]">
        {children}
      </h2>
    </Reveal>
  )
}

/** The real overview, rising from a tilt and settling flat as you scroll. */
function ScrollShowcase() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0])
  const rotateZ = useTransform(scrollYProgress, [0, 1], [-3, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1])
  return (
    <section id="product" aria-labelledby="product-title" className={`${FRAME} scroll-mt-20 pt-24`}>
      <SectionHead index="01" label="The product" id="product-title" aside={<span className="ft-label hidden sm:inline">Overview screen</span>}>
        One loud screen <span className="ft-serif">for the whole month.</span>
      </SectionHead>
      <div ref={ref} className="mt-14 [perspective:1400px]">
        <motion.figure style={{ rotateX, rotateZ, scale }} className="origin-top">
          <div className="overflow-hidden rounded-[22px] border-2 border-ink bg-surface p-2 shadow-[10px_10px_0_#16140f]">
            <img
              src="/preview/overview-1600.webp"
              srcSet="/preview/overview-960.webp 960w, /preview/overview-1600.webp 1600w"
              sizes="(min-width: 1360px) 1280px, 100vw"
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full rounded-[14px]"
              alt="The FinTrack overview: total balance with a spinning gold coin, this month's income, spending and savings, a spending-pace chart against last month, and insights worth your attention."
            />
          </div>
          <figcaption className="ft-label mt-4">Fig. 2 · The overview, with a year of sample data loaded</figcaption>
        </motion.figure>
      </div>
    </section>
  )
}

/** Features as a bento of sticker cards you can grab and throw; each has a small live specimen. */
function Features({ p }: { p: HeroPreview }) {
  const budget = 84
  const cards: { title: string; body: string; specimen: ReactNode; className: string; bg: string; rotate: number }[] = [
    {
      title: 'A loud monthly overview',
      body: 'Balance, income, spending and savings, and how this month compares with the last, day for day.',
      className: 'md:col-span-7',
      bg: 'bg-accent',
      rotate: -1,
      specimen: (
        <dl className="grid grid-cols-3 gap-3">
          {([['Income', p.income], ['Spent', p.expense], ['Kept', p.net]] as const).map(([l, v]) => (
            <div key={l} className="rounded-[12px] border-2 border-ink bg-surface p-2.5">
              <dt className="ft-label text-ink-2">{l}</dt>
              <dd className="num mt-1 font-display text-sm font-extrabold tracking-[-0.03em] text-ink sm:text-lg">{inr(v)}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      title: 'Budgets that warn early',
      body: 'Flagged at 80% of the limit, before the month is gone.',
      className: 'md:col-span-5',
      bg: 'bg-surface',
      rotate: 1.2,
      specimen: (
        <div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-ink-2">Transport (example)</span>
            <span className="num font-mono text-caution">{budget}% used</span>
          </div>
          <div className="relative mt-2 h-5 overflow-hidden rounded-full border-2 border-ink bg-sunken">
            <motion.div className="h-full rounded-full border-r-2 border-ink bg-tangerine" initial={{ width: 0 }} whileInView={{ width: `${budget}%` }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 60, damping: 11, delay: 0.2 }} />
            <span className="absolute inset-y-0 left-[80%] w-0.5 bg-ink" aria-hidden />
          </div>
          <p className="ft-label mt-2">Warning line at 80%</p>
        </div>
      ),
    },
    {
      title: 'Insights with the working shown',
      body: 'Every insight is calculated from your own numbers. Open one to see its formula.',
      className: 'md:col-span-5',
      bg: 'bg-cobalt text-white',
      rotate: -0.8,
      specimen: (
        <details className="group rounded-[12px] border-2 border-ink bg-surface p-3 text-xs text-ink">
          <summary className="cursor-pointer list-none font-semibold marker:hidden">
            Spending pace · <span className="underline decoration-cobalt decoration-2 underline-offset-2">show basis</span>
          </summary>
          <p className="mt-2 font-mono text-ink-3">(Spent 1st→today − same days last month) ÷ same days last month × 100</p>
        </details>
      ),
    },
    {
      title: 'Trends across months',
      body: 'Income against spending, savings rate, busiest weekday and largest expenses.',
      className: 'md:col-span-7',
      bg: 'bg-surface',
      rotate: 0.8,
      specimen: (
        <div>
          <div className="flex h-20 items-end gap-2" aria-hidden>
            {[42, 64, 51, 78, 58, 88, 70].map((h, i) => (
              <motion.span key={i} className={`flex-1 rounded-t-[6px] border-2 border-b-0 border-ink ${i === 6 ? 'bg-accent' : i % 2 ? 'bg-cobalt' : 'bg-tangerine'}`} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 140, damping: 10, delay: i * 0.06 }} />
            ))}
          </div>
          <div className="h-0.5 bg-ink" />
          <p className="ft-label mt-2">Illustrative shape</p>
        </div>
      ),
    },
    {
      title: 'Fast, and yours to export',
      body: 'Press N anywhere to add a transaction. Export everything to CSV.',
      className: 'md:col-span-6',
      bg: 'bg-tangerine',
      rotate: -1.2,
      specimen: (
        <div className="flex items-center gap-3">
          <motion.kbd
            whileHover={{ y: 3, boxShadow: '0 2px 0 #16140f' }}
            whileTap={{ y: 6, boxShadow: '0 0 0 #16140f' }}
            className="grid size-14 cursor-pointer place-items-center rounded-[12px] border-2 border-ink bg-surface font-display text-xl font-extrabold text-ink shadow-[0_6px_0_#16140f]"
          >
            N
          </motion.kbd>
          <span className="font-mono text-xs font-semibold text-ink">→ add transaction</span>
        </div>
      ),
    },
    {
      title: 'Any currency you live in',
      body: 'Every ISO currency, with digit grouping that follows each currency’s home convention.',
      className: 'md:col-span-6',
      bg: 'bg-surface',
      rotate: 1,
      specimen: (
        <ul className="num grid gap-1 font-mono text-sm text-ink-2">
          {['INR', 'USD', 'EUR'].map((c) => (
            <li key={c} className="flex justify-between gap-4 border-b-2 border-dashed border-line pb-1 last:border-0">
              <span className="font-semibold text-ink-3">{c}</span>
              <span className={c === 'INR' ? 'font-semibold text-ink' : ''}>{formatCurrency(566547, c)}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ]
  return (
    <section id="features" aria-labelledby="features-title" className={`${FRAME} scroll-mt-20 pt-32 lg:pt-40`}>
      <SectionHead index="02" label="What it does" id="features-title" aside={<span className="ft-label hidden [@media(hover:hover)_and_(pointer:fine)]:sm:inline">Grab a card · throw it</span>}>
        Built around the questions <span className="ft-serif">you actually ask.</span>
      </SectionHead>
      <ol className="mt-14 grid gap-5 md:grid-cols-12">
        {cards.map((c, i) => (
          <Reveal as="li" key={c.title} delay={i * 50} className={c.className}>
            <PullCard rotate={c.rotate} className="h-full">
              <article className={`flex h-full flex-col justify-between gap-8 rounded-[22px] border-2 border-ink p-6 shadow-[6px_6px_0_#16140f] sm:p-7 ${c.bg}`}>
                <div>
                  <span className="num font-mono text-xs font-semibold opacity-70">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-[-0.04em] sm:text-[1.75rem]">{c.title}</h3>
                  <p className="mt-2 max-w-md text-base opacity-80">{c.body}</p>
                </div>
                <div>{c.specimen}</div>
              </article>
            </PullCard>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}

/** Inverted section: the one place the page flips to ink. */
function Privacy() {
  const facts = ['Guest data stays in this browser', 'Row-level security on every table', '20 automated RLS checks', 'No tracking, no ads']
  return (
    <section id="privacy" aria-labelledby="privacy-title" className="mt-32 scroll-mt-16 border-y-2 border-ink bg-ink text-paper lg:mt-40">
      <div className={`${FRAME} grid gap-12 py-20 lg:grid-cols-12 lg:py-28`}>
        <div className="lg:col-span-7">
          <SectionHead index="03" label="Private by default" id="privacy-title" invert>
            Your numbers stay <span className="text-accent">yours.</span>
          </SectionHead>
        </div>
        <Reveal delay={120} className="lg:col-span-5 lg:self-end">
          <p className="text-lg leading-relaxed text-paper/80">
            Guest workspaces never leave your browser. Synced accounts are isolated by Postgres row-level security, checked by 20 automated database tests.
          </p>
          <ul className="mt-8 grid gap-2">
            {facts.map((f, i) => (
              <li key={f} className="flex items-center gap-4 rounded-[12px] border-2 border-paper/25 px-4 py-3 text-sm font-semibold transition-colors hover:border-accent">
                <span className="grid size-6 place-items-center rounded-full bg-accent font-mono text-[10px] text-ink">{String(i + 1).padStart(2, '0')}</span>
                {f}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
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
  const card = 'flex h-full flex-col rounded-[24px] border-2 border-ink p-7 shadow-[6px_6px_0_#16140f] sm:p-8'
  return (
    <section id="start" aria-labelledby="start-title" className={`${FRAME} scroll-mt-20 pt-32 lg:pt-40`}>
      <SectionHead index="04" label="How it works" id="start-title">
        Three ways <span className="ft-serif">in.</span>
      </SectionHead>
      <p className="mt-6 max-w-xl text-lg text-ink-2">
        {hasBackend
          ? 'Look around as a guest with a year of sample data, or create a free account to track your own money on every device.'
          : 'Look around as a guest with a year of sample data, or start a private workspace of your own in this browser.'}
      </p>

      <ol className="mt-14 grid gap-6 lg:grid-cols-3">
        <Reveal as="li" className="h-full">
          <div className={`${card} bg-accent`}>
            <p className="ft-label text-ink-2">01 · Just looking</p>
            <h3 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] text-ink">See the prototype</h3>
            <p className="mt-3 text-base text-ink-2">One click, no form. Every screen with 13 months of realistic sample data. Nothing is saved: close the tab and it’s gone.</p>
            <div className="mt-auto pt-8">
              <Button size="lg" variant="ink" className="w-full !rounded-full" loading={pending === 'sample'} onClick={() => open('sample')}>
                Continue as guest <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </div>
        </Reveal>

        {hasBackend ? (
          <>
            <Reveal as="li" delay={80} className="h-full">
              <div className={`${card} bg-surface`}>
                <p className="ft-label">02 · New here</p>
                <h3 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] text-ink">Create an account</h3>
                <p className="mt-3 text-base text-ink-2">Free, with email and password. Pick your currency, and your data syncs to every device behind row-level security.</p>
                <div className="mt-auto pt-8">
                  <Link to="/signup" className={`${PUSH} h-12 w-full bg-accent px-6 text-base text-on-accent hover:bg-accent-hover`}>
                    Create account <ArrowRight size={16} aria-hidden />
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal as="li" delay={160} className="h-full">
              <div className={`${card} bg-cobalt-soft`}>
                <p className="ft-label">03 · Coming back</p>
                <h3 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] text-ink">Log in</h3>
                <p className="mt-3 text-base text-ink-2">Pick up where you left off: your accounts, budgets and every transaction you’ve added.</p>
                <div className="mt-auto pt-8">
                  <Link to="/login" className={`${PUSH} h-12 w-full bg-surface px-6 text-base text-ink hover:bg-sunken`}>
                    Log in <ArrowRight size={16} aria-hidden />
                  </Link>
                </div>
              </div>
            </Reveal>
          </>
        ) : (
          <Reveal as="li" delay={80} className="h-full lg:col-span-2">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                open('own')
              }}
              className={`${card} bg-surface`}
            >
              <p className="ft-label">02 · Your own, in this browser</p>
              <h3 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] text-ink">Build your own FinTrack</h3>
              <p className="mt-3 max-w-md text-base text-ink-2">Start from zero and track your own income, spending and budgets. Saved privately in this browser, no sign-up.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="What should we call you?" optional>
                  {(fp) => <Input {...fp} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} placeholder="Your first name" />}
                </Field>
                <Field label="Currency">{(fp) => <CurrencySelect {...fp} value={currency} onChange={(e) => setCurrency(e.target.value)} />}</Field>
              </div>
              <div className="mt-auto pt-8">
                <Button type="submit" size="lg" className="w-full !rounded-full sm:w-auto" loading={pending === 'own'}>
                  Start tracking <ArrowRight size={16} aria-hidden />
                </Button>
              </div>
            </form>
          </Reveal>
        )}
      </ol>
    </section>
  )
}
