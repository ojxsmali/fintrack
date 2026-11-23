import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Wordmark } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { CurrencySelect } from '../components/ui/CurrencySelect'
import { AuthorCredit } from '../components/layout/AuthorCredit'
import { Reveal, SplitWords } from '../components/motion/Motion'
import { Magnetic } from '../components/motion/Interactive'
import { MoneyFlow } from '../components/landing/MoneyFlow'
import { useAuth, type Workspace } from '../services/authContext'
import { buildHeroPreview, type HeroPreview } from '../lib/heroPreview'
import { formatCurrency } from '../lib/format'
import { AUTHOR } from '../lib/brand'

const STACK = ['React 19', 'TypeScript', 'TanStack Query', 'Recharts', 'Supabase · Postgres RLS', 'motion', 'Vitest']

const inr = (n: number) => formatCurrency(Math.round(n), 'INR')

/** Page frame shared by every landing section: wide measure, fluid gutter. */
const FRAME = 'mx-auto w-full max-w-[1360px] px-[clamp(16px,3vw,40px)]'

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
      <a href="#hero" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xs focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-paper">
        <div className={`${FRAME} flex h-16 items-center justify-between gap-4`}>
          <Link to="/" aria-label="FinTrack home" className="rounded-xs">
            <Wordmark />
          </Link>
          <nav aria-label="Welcome" className="flex items-center gap-1 text-sm">
            <NavA href="#product" className="hidden md:inline-flex">Product</NavA>
            <NavA href="#features" className="hidden md:inline-flex">Features</NavA>
            <NavA href="#privacy" className="hidden lg:inline-flex">Privacy</NavA>
            {AUTHOR.repoUrl && (
              <NavA href={AUTHOR.repoUrl} external className="hidden sm:inline-flex">
                GitHub
              </NavA>
            )}
            {hasBackend && (
              <Link to="/login" className="inline-flex h-9 items-center rounded-xs px-3 font-medium text-ink-2 hover:text-ink">
                Sign in
              </Link>
            )}
            <Magnetic strength={0.25}>
              <a href="#start" className="ft-press ml-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 font-semibold text-on-accent transition-[transform,background-color] duration-300 ease-[var(--ease-spring)] hover:bg-accent-hover">
                Get started <ArrowUpRight size={15} aria-hidden />
              </a>
            </Magnetic>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section id="hero" aria-labelledby="hero-title" className={`${FRAME} pb-24 pt-10 sm:pt-14 lg:pb-32 lg:pt-16`}>
          <div className="ft-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line pb-4">
            <p className="ft-label">(FinTrack) — personal finance, made legible</p>
            <p className="ft-label flex items-center gap-2 text-ink-2">
              <span className="ft-live size-1.5 rounded-full bg-accent text-accent" aria-hidden="true" />
              Live prototype · no sign-up
            </p>
          </div>

          <h1 id="hero-title" className="ft-display mt-10 text-[clamp(2.9rem,7.9vw,8.4rem)] text-ink sm:mt-14">
            <SplitWords text="Where your money goes," />
            <br className="hidden sm:block" />{' '}
            <span className="ft-serif text-accent [letter-spacing:-0.02em]">
              <SplitWords text="and what’s changing." stagger={80} />
            </span>
          </h1>

          <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4">
              <p className="ft-page max-w-md text-lg leading-relaxed text-ink-2 [animation-delay:450ms] sm:text-xl sm:leading-relaxed">
                FinTrack turns everyday transactions into a clear monthly picture — what you earn, what you spend, and what deserves your attention.
              </p>
              <div className="ft-page mt-9 flex flex-col gap-3 [animation-delay:560ms] sm:flex-row lg:flex-col lg:items-start 2xl:flex-row">
                <Magnetic>
                  <Button size="lg" loading={pending === 'sample'} onClick={() => open('sample')} className="group w-full !rounded-full sm:w-auto">
                    Open the prototype <ArrowRight size={17} aria-hidden className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover:translate-x-1" />
                  </Button>
                </Magnetic>
                <a href="#start" className="ft-press inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-line-strong px-6 font-medium text-ink transition-colors hover:border-ink hover:bg-sunken">
                  Start your own
                </a>
              </div>
              <dl className="ft-page mt-12 grid grid-cols-2 border-t border-line [animation-delay:680ms]">
                <Fact term="Sample transactions" value={String(preview.transactionCount)} />
                <Fact term="Months of history" value="13" />
                <Fact term="Currencies" value="Every ISO" />
                <Fact term="Sign-up" value="Optional" />
              </dl>
            </div>
            <div className="ft-page [animation-delay:300ms] lg:col-span-8 lg:pl-6">
              <MoneyFlow p={preview} />
            </div>
          </div>
        </section>

        <ScrollShowcase />
        <Features p={preview} />
        <Privacy />
        <Start pending={pending} open={open} name={name} setName={setName} currency={currency} setCurrency={setCurrency} hasBackend={hasBackend} />
      </main>

      <footer className="mt-28 border-t border-line">
        <div className={`${FRAME} grid gap-10 py-12 md:grid-cols-12`}>
          <div className="md:col-span-5">
            <Wordmark />
            <p className="mt-4 max-w-sm text-sm text-ink-3">Guest workspaces stay in your browser. Synced accounts are protected by row-level security.</p>
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
            <p className="ft-label">Set in</p>
            <ul className="mt-3 grid gap-1 text-sm text-ink-2">
              <li>Geist</li>
              <li className="ft-serif text-base">Instrument Serif</li>
              <li className="font-mono text-xs">JetBrains Mono</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

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
    <div className="border-b border-line py-4 odd:pr-4 even:border-l even:pl-4">
      <dt className="ft-label">{term}</dt>
      <dd className="num mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-ink">{value}</dd>
    </div>
  )
}

/** Monospaced section marker on a hairline: "(01) The product". */
function SectionHead({ index, label, id, children, aside }: { index: string; label: string; id: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <Reveal>
      <div className="flex items-baseline justify-between gap-4 border-t border-ink/80 pt-3">
        <p className="ft-label text-ink-2">
          ({index}) {label}
        </p>
        {aside}
      </div>
      <h2 id={id} className="ft-display mt-8 max-w-[17ch] text-[clamp(2.5rem,6vw,5.75rem)] text-ink">
        {children}
      </h2>
    </Reveal>
  )
}

/** The real overview, rising from a tilt and settling flat as you scroll. */
function ScrollShowcase() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [14, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1])
  return (
    <section id="product" aria-labelledby="product-title" className={`${FRAME} scroll-mt-20 pt-8`}>
      <SectionHead index="01" label="The product" id="product-title" aside={<span className="ft-label hidden sm:inline">Overview screen</span>}>
        One calm screen <span className="ft-serif">for the whole month.</span>
      </SectionHead>
      <div ref={ref} className="mt-14 [perspective:1600px]">
        <motion.figure style={{ rotateX, scale }} className="origin-top">
          <div className="overflow-hidden rounded-lg border border-line-strong bg-surface p-1.5">
            <img
              src="/preview/overview-1600.webp"
              srcSet="/preview/overview-960.webp 960w, /preview/overview-1600.webp 1600w"
              sizes="(min-width: 1360px) 1280px, 100vw"
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full rounded-[10px]"
              alt="The FinTrack overview: total balance, this month's income, spending and savings, a spending-pace chart against last month, and insights worth your attention."
            />
          </div>
          <figcaption className="ft-label mt-3">Fig. 2 — The overview, with a year of sample data loaded</figcaption>
        </motion.figure>
      </div>
    </section>
  )
}

/** Features as a numbered ledger: one row per question the app answers, each with a small live specimen. */
function Features({ p }: { p: HeroPreview }) {
  const budget = 84
  const rows: { title: string; body: string; specimen: ReactNode }[] = [
    {
      title: 'A calm monthly overview',
      body: 'Balance, income, spending and savings — and how this month compares with the last, day for day.',
      specimen: (
        <dl className="grid grid-cols-3 gap-4">
          {([['Income', p.income], ['Spent', p.expense], ['Saved', p.net]] as const).map(([l, v]) => (
            <div key={l}>
              <dt className="ft-label">{l}</dt>
              <dd className={`num mt-1 text-base font-semibold tracking-[-0.03em] sm:text-lg ${l === 'Saved' && v > 0 ? 'text-accent' : 'text-ink'}`}>{inr(v)}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      title: 'Budgets that warn early',
      body: 'Flagged at 80% of the limit, before the month is gone.',
      specimen: (
        <div>
          <div className="flex justify-between text-xs">
            <span className="text-ink-2">Transport (example)</span>
            <span className="num font-mono text-caution">{budget}% used</span>
          </div>
          <div className="relative mt-2 h-2 bg-sunken">
            <motion.div className="h-full bg-caution" initial={{ width: 0 }} whileInView={{ width: `${budget}%` }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.2 }} />
            <span className="absolute -top-1 bottom-[-4px] left-[80%] w-px bg-ink" aria-hidden />
          </div>
          <p className="ft-label mt-2">Warning line at 80%</p>
        </div>
      ),
    },
    {
      title: 'Insights with the working shown',
      body: 'Every insight is calculated from your own numbers. Open one to see its formula.',
      specimen: (
        <details className="group border border-line p-3 text-xs">
          <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
            Spending pace — <span className="text-accent underline underline-offset-2">show basis</span>
          </summary>
          <p className="mt-2 font-mono text-ink-3">(Spent 1st→today − same days last month) ÷ same days last month × 100</p>
        </details>
      ),
    },
    {
      title: 'Trends across months',
      body: 'Income against spending, savings rate, busiest weekday and largest expenses.',
      specimen: (
        <div>
          <div className="flex h-14 items-end gap-1.5" aria-hidden>
            {[42, 64, 51, 78, 58, 88, 70].map((h, i) => (
              <motion.span key={i} className={`flex-1 ${i === 6 ? 'bg-accent' : 'bg-ink/30'}`} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: i * 0.05 }} />
            ))}
          </div>
          <p className="ft-label mt-2">Illustrative shape</p>
        </div>
      ),
    },
    {
      title: 'Fast, and yours to export',
      body: 'Press N anywhere to add a transaction. Export everything to CSV.',
      specimen: (
        <div className="flex items-center gap-3">
          <motion.kbd
            whileHover={{ y: 3, boxShadow: '0 1px 0 #383838' }}
            whileTap={{ y: 4, boxShadow: '0 0 0 #383838' }}
            className="grid size-12 cursor-default place-items-center rounded-xs border border-line-strong bg-sunken font-mono text-lg font-semibold text-ink shadow-[0_4px_0_#383838]"
          >
            N
          </motion.kbd>
          <span className="font-mono text-xs text-ink-3">→ add transaction</span>
        </div>
      ),
    },
    {
      title: 'Any currency you live in',
      body: 'Every ISO currency is supported, with digit grouping that follows each currency’s home convention.',
      specimen: (
        <ul className="num grid gap-1 font-mono text-sm text-ink-2">
          {['INR', 'USD', 'EUR'].map((c) => (
            <li key={c} className="flex justify-between gap-4 border-b border-line pb-1 last:border-0">
              <span className="text-ink-3">{c}</span>
              <span className={c === 'INR' ? 'text-ink' : ''}>{formatCurrency(566547, c)}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ]
  return (
    <section id="features" aria-labelledby="features-title" className={`${FRAME} scroll-mt-20 pt-32 lg:pt-44`}>
      <SectionHead index="02" label="What it does" id="features-title" aside={<span className="ft-label hidden sm:inline">{rows.length} entries</span>}>
        Built around the questions <span className="ft-serif">you actually ask.</span>
      </SectionHead>
      <ol className="mt-16 border-t border-line">
        {rows.map((r, i) => (
          <Reveal as="li" key={r.title} delay={i * 40} className="group border-b border-line">
            <div className="grid gap-5 py-8 transition-colors duration-300 md:grid-cols-12 md:items-center md:gap-8 md:py-10">
              <span className="num font-mono text-sm text-ink-3 transition-colors group-hover:text-accent md:col-span-1">{String(i + 1).padStart(2, '0')}</span>
              <div className="md:col-span-6">
                <h3 className="text-2xl font-semibold tracking-[-0.035em] text-ink transition-transform duration-500 ease-[var(--ease-reveal)] group-hover:translate-x-1.5 sm:text-[2rem] sm:leading-tight">{r.title}</h3>
                <p className="mt-2 max-w-md text-base text-ink-3">{r.body}</p>
              </div>
              <div className="md:col-span-5">{r.specimen}</div>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}

/** Inverted section: the one place the page flips to white paper. */
function Privacy() {
  const facts = ['Guest data stays in this browser', 'Row-level security on every table', '20 automated RLS checks', 'No tracking, no ads']
  return (
    <section id="privacy" aria-labelledby="privacy-title" className="mt-32 scroll-mt-16 bg-ink text-paper lg:mt-44">
      <div className={`${FRAME} grid gap-12 py-20 lg:grid-cols-12 lg:py-28`}>
        <Reveal className="lg:col-span-7">
          <p className="font-mono text-2xs font-medium uppercase tracking-[0.08em] text-paper/70">(03) Private by default</p>
          <h2 id="privacy-title" className="ft-display mt-8 text-[clamp(2.5rem,6vw,5.75rem)]">
            Your numbers stay <span className="ft-serif">yours.</span>
          </h2>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-5 lg:self-end">
          <p className="text-lg leading-relaxed text-paper/80">
            Guest workspaces never leave your browser. Synced accounts are isolated by Postgres row-level security, checked by 20 automated database tests.
          </p>
          <ul className="mt-8 border-t border-paper/20">
            {facts.map((f, i) => (
              <li key={f} className="flex items-baseline gap-4 border-b border-paper/20 py-3 text-sm font-medium">
                <span className="font-mono text-2xs text-paper/60">{String(i + 1).padStart(2, '0')}</span>
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
  return (
    <section id="start" aria-labelledby="start-title" className={`${FRAME} scroll-mt-20 pt-32 lg:pt-44`}>
      <SectionHead index="04" label="Get started" id="start-title">
        Two ways <span className="ft-serif text-accent">in.</span>
      </SectionHead>
      <p className="mt-6 max-w-xl text-lg text-ink-2">Look around with a year of realistic data, or start a private workspace of your own. Both run entirely in your browser.</p>

      <div className="mt-14 grid border-t border-line md:grid-cols-2">
        <Reveal className="border-b border-line py-10 md:border-b-0 md:border-r md:pr-10">
          <div className="flex h-full flex-col">
            <p className="ft-label">Option A</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">See the prototype</h3>
            <p className="mt-3 max-w-md text-base text-ink-2">Every screen with a year of realistic sample data — dashboard, budgets, analytics and insights. Nothing to set up.</p>
            <ul className="mt-6 grid gap-2 text-sm text-ink-2">
              {['13 months of income and spending', 'Five category budgets with live progress', 'Insights you can check the working of'].map((t) => (
                <li key={t} className="flex items-baseline gap-3">
                  <span className="font-mono text-2xs text-accent" aria-hidden>→</span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-10">
              <Button size="lg" variant="secondary" className="w-full !rounded-full sm:w-auto" loading={pending === 'sample'} onClick={() => open('sample')}>
                Open the prototype <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </div>
        </Reveal>
        <Reveal delay={90} className="py-10 md:pl-10">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              open('own')
            }}
            className="flex h-full flex-col"
          >
            <p className="ft-label text-accent">Option B</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">Build your own FinTrack</h3>
            <p className="mt-3 max-w-md text-base text-ink-2">Start from zero and track your own income, spending and budgets. Saved privately in this browser — no sign-up.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="What should we call you?" optional>
                {(fp) => <Input {...fp} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} placeholder="Your first name" />}
              </Field>
              <Field label="Currency">{(fp) => <CurrencySelect {...fp} value={currency} onChange={(e) => setCurrency(e.target.value)} />}</Field>
            </div>
            <div className="mt-auto pt-10">
              <Button type="submit" size="lg" className="w-full !rounded-full sm:w-auto" loading={pending === 'own'}>
                Start tracking <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </form>
        </Reveal>
      </div>
      {hasBackend && (
        <p className="mt-6 text-sm text-ink-3">
          Want it on every device?{' '}
          <Link to="/signup" className="font-medium text-accent underline underline-offset-2 hover:no-underline">
            Create a free account
          </Link>{' '}
          or{' '}
          <Link to="/login" className="font-medium text-accent underline underline-offset-2 hover:no-underline">
            sign in
          </Link>
          .
        </p>
      )}
    </section>
  )
}
