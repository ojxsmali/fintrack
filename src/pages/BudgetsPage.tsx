import { useMemo, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Button, IconButton } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Field, Input, Select } from '../components/ui/Field'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States'
import { useToast } from '../components/ui/toastContext'
import { BudgetProgress } from '../components/budgets/BudgetProgress'
import { useBudgets, useCategories, useCurrency, useDeleteBudget, useSaveBudget, useTransactionsInRange } from '../hooks/useFinance'
import { budgetStatuses, overallBudgetUsage, spendingByCategory, type BudgetStatus } from '../lib/finance'
import { addMonths, fmt, monthRange } from '../lib/dates'
import { currencySymbol, formatCurrency, formatPercent } from '../lib/format'
import { validateBudget } from '../lib/validation'
import { friendlyError } from '../services/repository'
import type { Budget } from '../types/finance'

export function BudgetsPage() {
  const currency = useCurrency()
  const money = (n: number) => formatCurrency(n, currency)
  const [offset, setOffset] = useState(0)
  const [today] = useState(() => new Date())
  const month = useMemo(() => addMonths(today, offset), [today, offset])
  const range = useMemo(() => monthRange(month), [month])
  const budgets = useBudgets()
  const categories = useCategories()
  const txs = useTransactionsInRange(range)
  const [editing, setEditing] = useState<Budget | 'new' | null>(null)
  const [deleting, setDeleting] = useState<BudgetStatus | null>(null)
  const del = useDeleteBudget()
  const toast = useToast()

  const statuses = useMemo(
    () => (budgets.data && txs.data && categories.data ? budgetStatuses(budgets.data, txs.data, categories.data).sort((a, b) => a.categoryName.localeCompare(b.categoryName)) : null),
    [budgets.data, txs.data, categories.data],
  )
  const summary = useMemo(() => {
    if (!statuses || !txs.data || !categories.data) return null
    const budgeted = new Set(statuses.map((s) => s.budget.category_id))
    const limit = statuses.reduce((n, s) => n + s.limit, 0)
    const spent = statuses.reduce((n, s) => n + s.spent, 0)
    const unbudgeted = spendingByCategory(txs.data, categories.data).filter((c) => !budgeted.has(c.categoryId))
    return { limit, spent, remaining: limit - spent, usage: overallBudgetUsage(statuses), unbudgeted }
  }, [statuses, txs.data, categories.data])

  const error = budgets.error || categories.error || txs.error
  const loading = budgets.isLoading || categories.isLoading || txs.isLoading

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.budget.id)
      toast(`${deleting.categoryName} budget deleted`)
      setDeleting(null)
    } catch (e) {
      toast(friendlyError(e), { tone: 'error' })
    }
  }

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Monthly limits for the categories you want to keep an eye on."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>
            New budget
          </Button>
        }
      />

      <div className="mb-6 flex items-center gap-1">
        <IconButton label="Previous month" onClick={() => setOffset((o) => o - 1)}>
          <ChevronLeft size={18} />
        </IconButton>
        <h2 className="min-w-36 text-center text-base font-medium" aria-live="polite">
          {fmt.month(month)} {month.getFullYear()}
        </h2>
        <IconButton label="Next month" onClick={() => setOffset((o) => o + 1)} disabled={offset >= 0} className="disabled:opacity-30">
          <ChevronRight size={18} />
        </IconButton>
        {offset < 0 && (
          <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
            This month
          </Button>
        )}
      </div>

      {error && !statuses ? (
        <ErrorState error={error} onRetry={() => (budgets.refetch(), txs.refetch())} />
      ) : loading || !statuses || !summary ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-20" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : statuses.length === 0 ? (
        <EmptyState
          title="No budgets yet."
          body="Pick a category you spend on regularly — food, transport, shopping — and set a monthly limit. FinTrack tracks it automatically from your transactions."
          action={<Button onClick={() => setEditing('new')}>Create your first budget</Button>}
        />
      ) : (
        <>
          <section aria-label="Budget summary" className="mb-8 grid grid-cols-2 gap-6 border-y border-line py-5 sm:grid-cols-4">
            <SummaryStat label="Budgeted" value={money(summary.limit)} />
            <SummaryStat label="Spent" value={money(summary.spent)} />
            <SummaryStat label={summary.remaining >= 0 ? 'Remaining' : 'Over'} value={money(Math.abs(summary.remaining))} tone={summary.remaining < 0 ? 'text-negative' : undefined} />
            <SummaryStat label="Used" value={formatPercent(summary.usage, { digits: 0 })} />
          </section>

          <ul className="flex flex-col divide-y divide-line border-b border-line">
            {statuses.map((s) => (
              <li key={s.budget.id} className="flex items-start gap-3 py-5 sm:items-center sm:gap-6">
                <div className="min-w-0 flex-1">
                  <BudgetProgress status={s} currency={currency} />
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <IconButton label={`Edit ${s.categoryName} budget`} onClick={() => setEditing(s.budget)}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton label={`Delete ${s.categoryName} budget`} onClick={() => setDeleting(s)}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>

          {summary.unbudgeted.length > 0 && (
            <section className="mt-10" aria-labelledby="unbudgeted">
              <h2 id="unbudgeted" className="text-sm font-semibold">
                Spending without a budget
              </h2>
              <p className="mt-0.5 text-xs text-ink-3">
                {money(summary.unbudgeted.reduce((n, c) => n + c.amount, 0))} in {fmt.month(month)} across {summary.unbudgeted.length}{' '}
                {summary.unbudgeted.length === 1 ? 'category' : 'categories'}.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {summary.unbudgeted.map((c) => (
                  <li key={c.categoryId} className="rounded-sm border border-line px-2.5 py-1 text-sm">
                    <span className="text-ink-2">{c.name}</span> <span className="num ml-1 font-medium">{money(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {editing && (
        <BudgetDialog
          budget={editing === 'new' ? null : editing}
          taken={new Set((budgets.data ?? []).map((b) => b.category_id))}
          onClose={() => setEditing(null)}
          currency={currency}
        />
      )}
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete the ${deleting?.categoryName ?? ''} budget?`}
        description="Your transactions stay as they are; only the monthly limit is removed."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={del.isPending}>
              Delete budget
            </Button>
          </>
        }
      />
    </>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-sm text-ink-3">{label}</p>
      <p className={`num mt-1 text-xl font-medium tracking-[-0.02em] ${tone ?? 'text-ink'}`}>{value}</p>
    </div>
  )
}

function BudgetDialog({ budget, taken, onClose, currency }: { budget: Budget | null; taken: Set<string>; onClose: () => void; currency: string }) {
  const { data: categories = [] } = useCategories()
  const save = useSaveBudget()
  const toast = useToast()
  const [categoryId, setCategoryId] = useState(budget?.category_id ?? '')
  const [limit, setLimit] = useState(budget ? String(budget.monthly_limit) : '')
  const [errors, setErrors] = useState<{ category_id?: string; monthly_limit?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const options = categories.filter((c) => c.kind === 'expense' && (!taken.has(c.id) || c.id === budget?.category_id))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const res = validateBudget({ category_id: categoryId, monthly_limit: limit }, { categories })
    if (!res.ok) return setErrors(res.errors)
    try {
      await save.mutateAsync({ id: budget?.id, input: res.value })
      toast(budget ? 'Budget updated' : 'Budget created')
      onClose()
    } catch (err) {
      setFormError(friendlyError(err))
    }
  }

  return (
    <Dialog open onClose={onClose} title={budget ? 'Edit budget' : 'New budget'} description="Limits reset on the 1st of each month.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Category" error={errors.category_id}>
          {(p) => (
            <Select {...p} value={categoryId} onChange={(e) => (setCategoryId(e.target.value), setErrors((x) => ({ ...x, category_id: undefined })))}>
              <option value="" disabled>
                Choose a category…
              </option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Monthly limit" error={errors.monthly_limit}>
          {(p) => (
            <Input
              {...p}
              inputMode="decimal"
              prefix={currencySymbol(currency)}
              placeholder="0"
              value={limit}
              onChange={(e) => (setLimit(e.target.value), setErrors((x) => ({ ...x, monthly_limit: undefined })))}
              className="num"
            />
          )}
        </Field>
        {formError && (
          <p role="alert" className="rounded-sm bg-negative-soft px-3 py-2 text-sm text-negative">
            {formError}
          </p>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {budget ? 'Save changes' : 'Create budget'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
