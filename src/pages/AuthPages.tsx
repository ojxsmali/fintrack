import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Wordmark } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { Field, Input, PasswordInput } from '../components/ui/Field'
import { CurrencySelect } from '../components/ui/CurrencySelect'
import { AuthorCredit } from '../components/layout/AuthorCredit'
import { useAuth } from '../services/authContext'
import { validateEmail, validatePassword } from '../lib/validation'

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,560px)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r-2 border-ink bg-accent p-12 lg:flex">
        <Link to="/" aria-label="FinTrack home">
          <Wordmark />
        </Link>
        <div className="max-w-md">
          <p className="ft-display text-6xl text-ink">Your money,<br />stacked up.</p>
          <ul className="mt-10 flex flex-col gap-4 text-sm text-ink-2">
            {['A loud monthly overview: balance, spending, savings.', 'Budgets that warn you early, at 80% of the limit.', 'Insights calculated from your own numbers, with the working shown.'].map((t) => (
              <li key={t} className="rounded-[14px] border-2 border-ink bg-surface px-4 py-3 font-semibold text-ink shadow-[3px_3px_0_#16140f]">
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-1 text-xs text-ink-2">
          <p>Your data is private to your account and protected by row-level security.</p>
          <AuthorCredit />
        </div>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link to="/" aria-label="FinTrack home" className="lg:hidden">
          <Wordmark />
        </Link>
        <div className="mx-auto my-auto w-full max-w-sm py-10">{children}</div>
        <AuthorCredit className="text-center text-xs text-ink-3 lg:hidden" />
      </main>
    </div>
  )
}

/** Without a backend there are no accounts — send people to the welcome page's guest options. */
function DemoEntry() {
  return <Navigate to="/" replace />
}

function GuestDemoButton() {
  return (
    <p className="mt-8 border-t border-line pt-6 text-sm text-ink-3">
      Just looking?{' '}
      <Link to="/" className="font-medium text-accent-ink underline-offset-2 hover:underline">
        Try the prototype or build your own — no sign-up
      </Link>
    </p>
  )
}

export function LoginPage() {
  const { status, hasBackend, signIn, notice, clearNotice } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  if (status === 'signedIn') return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const errs = { email: validateEmail(email) ?? undefined, password: validatePassword(password, 'login') ?? undefined }
    setErrors(errs)
    if (errs.email || errs.password) return
    setPending(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em]">Sign in</h1>
      <p className="mt-1 mb-8 text-sm text-ink-3">Welcome back.</p>
      {notice && (
        <p role="alert" className="mb-5 rounded-sm bg-caution-soft px-3 py-2 text-sm text-caution">
          {notice}{' '}
          <button type="button" onClick={clearNotice} className="ml-1 underline underline-offset-2">
            Dismiss
          </button>
        </p>
      )}
      {!hasBackend ? (
        <DemoEntry />
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field label="Email" error={errors.email}>
            {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Field label="Password" error={errors.password}>
            {(p) => <PasswordInput {...p} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          {formError && (
            <div role="alert" className="rounded-sm bg-negative-soft px-3 py-2 text-sm text-negative">
              <p>{formError}</p>
              {/confirm your email/i.test(formError) && <ResendLink email={email} />}
            </div>
          )}
          <Button type="submit" size="lg" loading={pending} className="mt-2">
            Sign in
          </Button>
          <p className="mt-2 text-sm text-ink-3">
            New to FinTrack?{' '}
            <Link to="/signup" className="font-medium text-accent-ink underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      )}
      {hasBackend && <GuestDemoButton />}
    </AuthLayout>
  )
}

export function SignupPage() {
  const { status, hasBackend, signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (status === 'signedIn') return <Navigate to="/dashboard" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const errs = {
      name: !name.trim() ? 'Tell us what to call you.' : name.trim().length > 60 ? 'Keep it under 60 characters.' : undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password, 'signup') ?? undefined,
    }
    setErrors(errs)
    if (errs.name || errs.email || errs.password) return
    setPending(true)
    try {
      const { needsConfirmation } = await signUp(name, email, password, currency)
      if (needsConfirmation) setSentTo(email.trim())
      else navigate('/dashboard', { replace: true })
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout>
      {sentTo ? (
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em]">Check your inbox</h1>
          <p className="mt-2 text-sm text-ink-2">
            We sent a confirmation link to <span className="font-medium text-ink">{sentTo}</span>. Open it on this device to finish creating your account.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-3">
            <li>It can take a minute or two to arrive — check your spam or promotions folder too.</li>
            <li>The email comes from Supabase Auth, FinTrack’s sign-in provider.</li>
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <ResendLink email={sentTo} />
            <button type="button" onClick={() => setSentTo(null)} className="font-medium text-ink-3 underline-offset-2 hover:text-ink hover:underline">
              Use a different email
            </button>
            <Link to="/login" className="font-medium text-accent-ink underline-offset-2 hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em]">Create your account</h1>
          <p className="mt-1 mb-8 text-sm text-ink-3">Free, private, and yours to export any time.</p>
          {!hasBackend ? (
            <DemoEntry />
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <Field label="Name" error={errors.name}>
                {(p) => <Input {...p} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />}
              </Field>
              <Field label="Email" error={errors.email}>
                {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
              </Field>
              <Field label="Currency" hint="You can change this later in Settings.">
                {(p) => <CurrencySelect {...p} value={currency} onChange={(e) => setCurrency(e.target.value)} />}
              </Field>
              <Field label="Password" error={errors.password} hint="At least 8 characters.">
                {(p) => <PasswordInput {...p} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
              </Field>
              {formError && (
                <p role="alert" className="rounded-sm bg-negative-soft px-3 py-2 text-sm text-negative">
                  {formError}
                </p>
              )}
              <Button type="submit" size="lg" loading={pending} className="mt-2">
                Create account
              </Button>
              <p className="mt-2 text-sm text-ink-3">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-accent-ink underline-offset-2 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
          {hasBackend && <GuestDemoButton />}
        </>
      )}
    </AuthLayout>
  )
}

/** Re-sends the confirmation email, with a 60-second cooldown to respect Supabase's email limits. */
function ResendLink({ email }: { email: string }) {
  const { resendConfirmation } = useAuth()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const send = async () => {
    if (validateEmail(email)) {
      setState('error')
      setMessage('Enter your email above first.')
      return
    }
    setState('sending')
    try {
      await resendConfirmation(email)
      setState('sent')
      setCooldown(60)
      const t = setInterval(() => setCooldown((c) => (c <= 1 ? (clearInterval(t), 0) : c - 1)), 1000)
    } catch (e) {
      setState('error')
      setMessage((e as Error).message)
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={send}
        disabled={state === 'sending' || cooldown > 0}
        className="font-medium text-accent-ink underline-offset-2 hover:underline disabled:text-ink-4 disabled:no-underline"
      >
        {state === 'sending' ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation email'}
      </button>
      {state === 'sent' && <span className="text-xs text-positive">Sent — check your inbox.</span>}
      {state === 'error' && <span className="text-xs text-negative">{message}</span>}
    </span>
  )
}
