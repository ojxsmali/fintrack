import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Field, Input, Select, Toggle } from '../components/ui/Field'
import { Skeleton } from '../components/ui/States'
import { useToast } from '../components/ui/toastContext'
import { useAccounts, useBalances, useHasSampleData, useProfile, useSampleData, useSaveAccount, useUpdateProfile } from '../hooks/useFinance'
import { useExportCsv } from '../hooks/useExportCsv'
import { useAuth } from '../services/authContext'
import { friendlyError } from '../services/repository'
import { useQueryClient } from '@tanstack/react-query'
import { currencySymbol, formatCurrency } from '../lib/format'
import { CurrencySelect } from '../components/ui/CurrencySelect'
import { parseAmount } from '../lib/validation'
import type { Account, AccountKind } from '../types/finance'

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-24 gap-4 border-t border-line py-8 md:grid-cols-[240px_1fr] md:gap-10">
      <div>
        <h2 id={`${id}-h`} className="text-sm font-semibold">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      <div className="min-w-0 max-w-xl">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const { user, mode, workspace, hasBackend, signOut, resetWorkspace, repo } = useAuth()
  const profile = useProfile()
  const update = useUpdateProfile()
  const toast = useToast()
  const location = useLocation()
  const qc = useQueryClient()
  const [nameDraft, setName] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'wipe' | 'reset' | null>(null)
  const [busy, setBusy] = useState(false)
  const sample = useSampleData()
  const hasSample = useHasSampleData()
  const exportCsv = useExportCsv()

  const name = nameDraft ?? profile.data?.display_name ?? ''

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [location.hash, profile.data])

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length > 60) return
    try {
      await update.mutateAsync({ display_name: name.trim() })
      toast('Profile saved')
    } catch (err) {
      toast(friendlyError(err), { tone: 'error' })
    }
  }

  const wipe = async () => {
    setBusy(true)
    try {
      await repo.deleteAllTransactions()
      await qc.invalidateQueries()
      toast('All transactions deleted')
      setConfirm(null)
    } catch (err) {
      toast(friendlyError(err), { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  if (profile.isLoading) return <Skeleton className="h-64" />

  return (
    <>
      <PageHeader title="Settings" />

      <Section id="profile" title="Profile" description="How FinTrack greets you.">
        <form onSubmit={saveName} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Field label="Display name" className="flex-1" error={name.trim().length > 60 ? 'Keep it under 60 characters.' : undefined}>
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />}
          </Field>
          <Button type="submit" variant="secondary" loading={update.isPending} disabled={name.trim() === (profile.data?.display_name ?? '')}>
            Save
          </Button>
        </form>
        {user?.email && <p className="mt-3 text-sm text-ink-3">Signed in as {user.email}</p>}
      </Section>

      <Section id="currency" title="Currency" description="The currency you track in. Every amount in the app uses it.">
        <Field
          label="Currency"
          hint="Changing it relabels your existing amounts — it doesn’t convert them at an exchange rate."
        >
          {(p) => (
            <CurrencySelect
              {...p}
              value={profile.data?.currency ?? 'INR'}
              onChange={(e) =>
                update.mutate(
                  { currency: e.target.value },
                  { onSuccess: (pr) => toast(`Currency set to ${pr.currency}`), onError: (err) => toast(friendlyError(err), { tone: 'error' }) },
                )
              }
            />
          )}
        </Field>
      </Section>

      <AccountsSection />

      <Section id="notifications" title="Alerts" description="What FinTrack points out on your overview.">
        <Toggle
          label="Budget warnings"
          description="Show insights when a budget is close to or over its limit."
          checked={profile.data?.show_budget_warnings ?? true}
          onChange={(v) =>
            update.mutate(
              { show_budget_warnings: v },
              { onSuccess: () => toast(v ? 'Budget warnings on' : 'Budget warnings off'), onError: (e) => toast(friendlyError(e), { tone: 'error' }) },
            )
          }
        />
      </Section>

      <Section id="data" title="Data" description="Your records, your copy.">
        <div className="flex flex-col gap-6">
          <Row title="Export transactions" body="Download every transaction as a CSV file.">
            <Button variant="secondary" onClick={exportCsv.run} loading={exportCsv.pending}>
              Export CSV
            </Button>
          </Row>
          <Row
            title="Sample data"
            body={hasSample.data ? 'Sample transactions are loaded and labelled “sample”. Remove them before tracking for real.' : 'Load a year of illustrative transactions to explore the product. Clearly labelled, removable in one click.'}
          >
            {hasSample.data ? (
              <Button
                variant="secondary"
                loading={sample.remove.isPending}
                onClick={() => sample.remove.mutate(undefined, { onSuccess: () => toast('Sample data removed'), onError: (e) => toast(friendlyError(e), { tone: 'error' }) })}
              >
                Remove sample data
              </Button>
            ) : (
              <Button
                variant="secondary"
                loading={sample.load.isPending}
                onClick={() => sample.load.mutate(undefined, { onSuccess: () => toast('Sample data loaded'), onError: (e) => toast(friendlyError(e), { tone: 'error' }) })}
              >
                Load sample data
              </Button>
            )}
          </Row>
          <Row title="Delete all transactions" body="Permanently removes every transaction. Accounts, categories and budgets are kept.">
            <Button variant="secondary" className="text-negative" onClick={() => setConfirm('wipe')}>
              Delete all…
            </Button>
          </Row>
        </div>
      </Section>

      <Section id="account" title="Account">
        <div className="flex flex-col gap-6">
          {mode === 'demo' ? (
            <>
              <p className="text-sm text-ink-2">
                {workspace === 'sample' ? 'You’re exploring the prototype: sample data stored only in this browser.' : 'This is your own FinTrack, stored privately in this browser — no account involved. Clearing your browser data will erase it, so export a CSV now and then.'}{hasBackend ? ' Prefer a synced account? Sign up from the welcome page.' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={signOut}>
                  Back to welcome page
                </Button>
                <Button variant="ghost" className="text-negative" onClick={() => setConfirm('reset')}>
                  Erase this workspace…
                </Button>
              </div>
            </>
          ) : (
            <Row title="Sign out" body="You’ll need your email and password to sign back in.">
              <Button variant="secondary" onClick={signOut}>
                Sign out
              </Button>
            </Row>
          )}
        </div>
      </Section>

      <Dialog
        open={confirm === 'wipe'}
        onClose={() => setConfirm(null)}
        title="Delete all transactions?"
        description="Every transaction will be permanently removed. This can’t be undone — export a CSV first if you want a copy."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={wipe} loading={busy}>
              Delete everything
            </Button>
          </>
        }
      />
      <Dialog
        open={confirm === 'reset'}
        onClose={() => setConfirm(null)}
        title={workspace === 'sample' ? 'Erase the prototype data?' : 'Erase your FinTrack?'}
        description="Everything in this browser workspace will be removed. This can’t be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={resetWorkspace}>
              Erase
            </Button>
          </>
        }
      />
    </>
  )
}

function Row({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-ink-3">{body}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

const KIND_LABEL: Record<AccountKind, string> = { bank: 'Bank account', card: 'Credit card', cash: 'Cash', wallet: 'Wallet' }

function AccountsSection() {
  const accounts = useAccounts()
  const balances = useBalances()
  const { data: profile } = useProfile()
  const currency = profile?.currency ?? 'INR'
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  const bal = new Map((balances.data ?? []).map((b) => [b.id, b.balance]))
  return (
    <Section id="accounts" title="Accounts" description="Total balance = starting balances + income − spending, across these accounts.">
      <ul className="divide-y divide-line rounded-md border border-line">
        {(accounts.data ?? []).map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{a.name}</p>
              <p className="text-xs text-ink-3">
                {KIND_LABEL[a.kind]} · started at <span className="num">{formatCurrency(a.starting_balance, currency)}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="num text-sm font-medium">{formatCurrency(bal.get(a.id) ?? a.starting_balance, currency)}</span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                Edit
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="mt-3" onClick={() => setEditing('new')}>
        + Add account
      </Button>
      {editing && <AccountDialog account={editing === 'new' ? null : editing} currency={currency} onClose={() => setEditing(null)} />}
    </Section>
  )
}

function AccountDialog({ account, currency, onClose }: { account: Account | null; currency: string; onClose: () => void }) {
  const save = useSaveAccount()
  const toast = useToast()
  const [name, setName] = useState(account?.name ?? '')
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'bank')
  const [start, setStart] = useState(account ? String(account.starting_balance) : '0')
  const [errors, setErrors] = useState<{ name?: string; start?: string }>({})

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Name the account.'
    else if (name.trim().length > 40) errs.name = 'Keep it under 40 characters.'
    const neg = start.trim().startsWith('-')
    const parsed = parseAmount(start.trim().replace(/^-/, ''))
    if (parsed === null) errs.start = 'Enter an amount, e.g. 25000 or -1200 for a card balance.'
    if (Object.keys(errs).length) return setErrors(errs)
    try {
      await save.mutateAsync({ id: account?.id, input: { name: name.trim(), kind, starting_balance: neg ? -parsed! : parsed! } })
      toast(account ? 'Account updated' : 'Account added')
      onClose()
    } catch (err) {
      toast(friendlyError(err), { tone: 'error' })
    }
  }

  return (
    <Dialog open onClose={onClose} title={account ? 'Edit account' : 'Add account'}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Name" error={errors.name}>
          {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />}
        </Field>
        <Field label="Type">
          {(p) => (
            <Select {...p} value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}>
              {Object.entries(KIND_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Starting balance" error={errors.start} hint="What was in this account before your first transaction in FinTrack. Use a negative number for money owed.">
          {(p) => <Input {...p} inputMode="decimal" prefix={currencySymbol(currency)} value={start} onChange={(e) => setStart(e.target.value)} className="num" />}
        </Field>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
