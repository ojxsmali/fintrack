import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Wordmark } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { CurrencySelect } from '../components/ui/CurrencySelect'
import { AuthorCredit } from '../components/layout/AuthorCredit'
import { useAuth, type Workspace } from '../services/authContext'

const FEATURES = [
  ['A calm monthly overview', 'Balance, income, spending and savings, with how this month compares to the last.'],
  ['Budgets that warn early', 'Monthly limits per category, flagged as you get close — not after the fact.'],
  ['Insights with the working shown', 'Every insight is calculated from your own numbers, and shows its basis.'],
] as const

export function WelcomePage() {
  const { status, hasBackend, startWorkspace } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [pending, setPending] = useState<Workspace | null>(null)

  if (status === 'signedIn') return <Navigate to="/dashboard" replace />

  const open = async (kind: Workspace) => {
    setPending(kind)
    await startWorkspace(kind, kind === 'own' ? name : '', currency)
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        {hasBackend && (
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/login" className="rounded-sm px-3 py-2 font-medium text-ink-2 hover:bg-sunken hover:text-ink">
              Sign in
            </Link>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-5 pb-16 pt-8 sm:px-8 md:pt-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-accent">Personal finance, made legible</p>
          <h1 className="mt-3 font-display text-[2.6rem] leading-[1.04] tracking-[-0.01em] text-ink sm:text-6xl">
            Where your money goes, and what’s changing.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">
            FinTrack turns everyday transactions into a clear monthly picture — so you can see what you earn, what you spend, and what deserves your attention.
          </p>
        </div>

        <section aria-label="Get started" className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-line bg-surface p-6 sm:p-7">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">Option 1</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">See the prototype</h2>
            <p className="mt-2 text-sm text-ink-2">
              Explore every screen with a year of realistic sample data — dashboard, budgets, analytics and insights. Nothing to set up.
            </p>
            <div className="mt-auto pt-6">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto" loading={pending === 'sample'} onClick={() => open('sample')}>
                Open the prototype <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              open('own')
            }}
            className="flex flex-col rounded-lg border border-ink bg-surface p-6 sm:p-7"
          >
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-accent">Option 2</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">Build your own FinTrack</h2>
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
            <div className="mt-auto pt-5">
              <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending === 'own'}>
                Start tracking <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </form>
        </section>

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

        <figure className="mt-14">
          <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(26,26,24,0.28)]">
            <div className="flex items-center gap-1.5 border-b border-line bg-sunken px-3 py-2" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
            </div>
            <img
              src="/preview/overview-1600.webp"
              srcSet="/preview/overview-960.webp 960w, /preview/overview-1600.webp 1600w"
              sizes="(min-width: 1120px) 1056px, 100vw"
              width={1600}
              height={1000}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
              alt="The FinTrack overview: total balance, this month's income, spending and savings, a spending-pace chart against last month, and insights worth your attention."
            />
          </div>
          <figcaption className="mt-3 text-sm text-ink-3">
            The prototype’s overview — balance, this month at a glance, spending pace and the insights worth a look.
          </figcaption>
        </figure>

        <ul className="mt-16 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
          {FEATURES.map(([t, d]) => (
            <li key={t}>
              <p className="text-sm font-semibold text-ink">{t}</p>
              <p className="mt-1 text-sm text-ink-3">{d}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-2 px-5 py-6 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <AuthorCredit />
          <p>Guest workspaces stay in your browser. Accounts are protected by row-level security.</p>
        </div>
      </footer>
    </div>
  )
}
