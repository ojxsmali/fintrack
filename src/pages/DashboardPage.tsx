import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Info } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { useSampleData } from '../hooks/useFinance'
import { formatCurrency, formatPercent } from '../lib/format'
import { Skeleton, EmptyState, ErrorState } from '../components/ui/States'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { useToast } from '../components/ui/toastContext'
import { SpendingPaceChart } from '../components/charts/Charts'
import { CategoryBars } from '../components/charts/CategoryBars'
import { BudgetProgress } from '../components/budgets/BudgetProgress'
import { TransactionList } from '../components/transactions/TransactionList'
import { useTransactionEditor } from '../components/transactions/editorContext'
import { InsightList } from '../components/dashboard/InsightList'
import { CountUp } from '../components/motion/Motion'
import { friendlyError } from '../services/repository'
import { useAuth } from '../services/authContext'

function greeting(d = new Date()) {
  const h = d.getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function DashboardPage() {
  const { isLoading, error, refetch, profile, data, currency, categories } = useDashboard()
  const editor = useTransactionEditor()
  const money = (n: number, sign?: boolean) => formatCurrency(n, currency, { sign: sign ? 'always' : 'negative' })
  const firstName = (profile?.display_name ?? '').split(' ')[0]

  if (error && !data) return <ErrorState error={error} onRetry={refetch} />
  if (isLoading || !data) return <DashboardSkeleton />

  const contextLine = !data.hasAnyData
    ? 'Your overview fills in as you add transactions.'
    : data.month.expense === 0
      ? `No spending recorded in ${data.monthName} yet.`
      : data.pace === null
        ? `You’ve spent ${money(data.month.expense)} so far in ${data.monthName}.`
        : `You’ve spent ${money(data.spentToDate)} so far in ${data.monthName} — ${formatPercent(Math.abs(data.pace))} ${data.pace <= 0 ? 'less' : 'more'} than at this point in ${data.prevMonthName}.`

  return (
    <div className="ft-stagger flex flex-col gap-10">
      <header>
        <h1 className="font-display text-[2.15rem] leading-[1.1] tracking-[-0.01em] text-ink sm:text-4xl">
          {greeting()}
          {firstName ? `, ${firstName}.` : '.'}
        </h1>
        <p className="mt-2 max-w-2xl text-base text-ink-2">{contextLine}</p>
      </header>

      {!data.hasAnyData ? (
        <FirstRun onAdd={(t) => editor.create(t)} />
      ) : (
        <>
          <BalanceStrip
            balance={data.balance}
            income={data.month.income}
            expense={data.month.expense}
            net={data.month.net}
            monthName={data.monthName}
            money={money}
            accounts={data.accounts.length}
          />
          <HealthRow savingsRate={data.savingsRate} budgetUsage={data.budgetUsage} pace={data.pace} prevMonthName={data.prevMonthName} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <SpendingPaceChart
              data={data.paceSeries}
              currency={currency}
              currentLabel={data.monthName}
              previousLabel={data.prevMonthName}
              summary={
                data.pace === null
                  ? `Cumulative spending by day. ${money(data.month.expense)} so far.`
                  : `Cumulative spending by day. ${formatPercent(Math.abs(data.pace))} ${data.pace <= 0 ? 'below' : 'above'} ${data.prevMonthName}’s pace.`
              }
            />
            <Panel id="insights" title="Worth your attention" description="Calculated from your transactions">
              <InsightList insights={data.insights.slice(0, 4)} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel
              id="categories"
              title="Where it went"
              description={`Spending by category, ${data.monthName}`}
              action={<SectionLink to="/analytics">Analytics</SectionLink>}
            >
              {data.byCategory.length ? (
                <CategoryBars data={data.byCategory} currency={currency} limit={6} />
              ) : (
                <EmptyState compact title="No spending this month yet." />
              )}
            </Panel>
            <Panel id="budgets" title="Budgets" description={`${data.monthName}`} action={<SectionLink to="/budgets">Manage</SectionLink>}>
              {data.budgets.length ? (
                <div className="flex flex-col gap-5">
                  {data.budgets.slice(0, 5).map((b) => (
                    <BudgetProgress key={b.budget.id} status={b} currency={currency} dense />
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  title="No budgets yet."
                  body="Set a monthly limit for a category and FinTrack will track it for you."
                  action={
                    <Link to="/budgets" className="text-sm font-medium text-accent underline-offset-2 hover:underline">
                      Create a budget
                    </Link>
                  }
                />
              )}
            </Panel>
          </div>

          <Panel id="recent" title="Recent transactions" action={<SectionLink to="/transactions">View all</SectionLink>}>
            <TransactionList txs={data.recent} categories={categories} />
          </Panel>
        </>
      )}
    </div>
  )
}

function SectionLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink">
      {children}
      <ArrowRight size={13} aria-hidden />
    </Link>
  )
}

function BalanceStrip({
  balance,
  income,
  expense,
  net,
  monthName,
  money,
  accounts,
}: {
  balance: number
  income: number
  expense: number
  net: number
  monthName: string
  money: (n: number, sign?: boolean) => string
  accounts: number
}) {
  return (
    <section aria-label="Balance overview" className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-6 md:grid-cols-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] lg:gap-0 lg:divide-x lg:divide-line">
      <div className="col-span-2 min-w-0 md:col-span-3 lg:col-span-1 lg:pr-8">
        <p className="text-sm text-ink-3">Total balance</p>
        <p className={`num mt-1 text-4xl font-medium tracking-[-0.035em] ${balance < 0 ? 'text-negative' : 'text-ink'}`}><CountUp value={balance} format={(n) => money(n)} /></p>
        <p className="mt-1 text-xs text-ink-3">
          Across {accounts} {accounts === 1 ? 'account' : 'accounts'} ·{' '}
          <Link to="/settings#accounts" className="underline-offset-2 hover:underline">
            starting balances
          </Link>
        </p>
      </div>
      <Stat label={`Income in ${monthName}`} amount={income} money={money} />
      <Stat label={`Spent in ${monthName}`} amount={expense} money={money} />
      <Stat
        label={net >= 0 ? `Saved in ${monthName}` : `Overspent in ${monthName}`}
        amount={Math.abs(net)}
        money={money}
        tone={net >= 0 ? (net > 0 ? 'positive' : undefined) : 'negative'}
        className="col-span-2 md:col-span-1"
      />
    </section>
  )
}

function Stat({ label, amount, money, tone, className = '' }: { label: string; amount: number; money: (n: number) => string; tone?: 'positive' | 'negative'; className?: string }) {
  return (
    <div className={`min-w-0 lg:px-6 xl:px-8 ${className}`}>
      <p className="text-sm text-ink-3">{label}</p>
      <p className={`num mt-1 text-xl font-medium tracking-[-0.02em] sm:text-2xl ${tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : 'text-ink'}`}>
        <CountUp value={amount} format={(n) => money(n)} />
      </p>
    </div>
  )
}

function HealthRow({ savingsRate, budgetUsage, pace, prevMonthName }: { savingsRate: number | null; budgetUsage: number | null; pace: number | null; prevMonthName: string }) {
  const [open, setOpen] = useState(false)
  const items = [
    { label: 'Savings rate', value: formatPercent(savingsRate, { digits: 0 }), note: savingsRate === null ? 'No income yet' : 'of income kept' },
    { label: 'Budget used', value: formatPercent(budgetUsage, { digits: 0 }), note: budgetUsage === null ? 'No budgets set' : 'across all budgets' },
    {
      label: 'Spending pace',
      value: pace === null ? '—' : `${pace <= 0 ? '↓' : '↑'} ${formatPercent(Math.abs(pace), { digits: 0 })}`,
      note: pace === null ? `No ${prevMonthName} data` : `vs ${prevMonthName}, same day`,
      tone: pace === null ? undefined : pace <= 0 ? 'text-positive' : 'text-caution',
    },
  ]
  return (
    <section aria-label="Financial health" className="-mt-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {items.map((i) => (
          <div key={i.label} className="flex items-baseline gap-2">
            <span className="text-sm text-ink-3">{i.label}</span>
            <span className={`num text-sm font-semibold ${i.tone ?? 'text-ink'}`}>{i.value}</span>
            <span className="hidden text-xs text-ink-4 sm:inline">{i.note}</span>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="health-explainer"
          className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink"
        >
          <Info size={13} aria-hidden /> How these are calculated
        </button>
      </div>
      {open && (
        <dl id="health-explainer" className="mt-4 grid gap-3 rounded-md bg-sunken/70 p-4 text-xs text-ink-2 sm:grid-cols-3">
          <div>
            <dt className="font-medium text-ink">Savings rate</dt>
            <dd className="mt-0.5">(Income − spending) ÷ income × 100, for this calendar month. Shown as — when there’s no income yet.</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Budget used</dt>
            <dd className="mt-0.5">Spending in budgeted categories ÷ the sum of their monthly limits × 100. Unbudgeted categories aren’t included.</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Spending pace</dt>
            <dd className="mt-0.5">Spending from the 1st to today vs the same days of last month: (this − last) ÷ last × 100.</dd>
          </div>
        </dl>
      )}
    </section>
  )
}

function FirstRun({ onAdd }: { onAdd: (t: 'expense' | 'income') => void }) {
  const { load } = useSampleData()
  const { workspace } = useAuth()
  const toast = useToast()
  return (
    <section className="border-y border-line py-10">
      <EmptyState
        title="No transactions yet."
        body="Add your first transaction to start understanding your spending. Start with this month’s income, then a few recent expenses — the overview, budgets and insights build from there."
        action={<Button onClick={() => onAdd('expense')}>Add transaction</Button>}
        secondary={
          <>
            <Button variant="secondary" onClick={() => onAdd('income')}>
              Add income
            </Button>
            {workspace !== 'own' && <Button
              variant="ghost"
              loading={load.isPending}
              onClick={() =>
                load.mutate(undefined, {
                  onSuccess: () => toast('Sample data loaded — remove it any time in Settings'),
                  onError: (e) => toast(friendlyError(e), { tone: 'error' }),
                })
              }
            >
              Explore with sample data
            </Button>}
          </>
        }
      />
      <ol className="mt-4 grid max-w-3xl gap-4 text-sm text-ink-2 sm:grid-cols-3">
        {[
          ['Set a starting balance', 'So your total reflects what’s in the bank today.', '/settings#accounts'],
          ['Record income and spending', 'Every transaction sharpens the picture.', null],
          ['Create a budget', 'Pick a category and a monthly limit.', '/budgets'],
        ].map(([t, d, href], i) => (
          <li key={t} className="border-t border-line pt-3">
            <span className="num text-xs text-ink-4">0{i + 1}</span>
            <p className="mt-1 font-medium text-ink">{href ? <Link to={href} className="hover:underline underline-offset-2">{t}</Link> : t}</p>
            <p className="mt-0.5 text-ink-3">{d}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy="true" aria-label="Loading overview">
      <div>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-6 border-y border-line py-6 md:grid-cols-4">
        <Skeleton className="col-span-2 h-14 md:col-span-1" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <Skeleton className="h-[330px] rounded-lg" />
        <Skeleton className="h-[330px] rounded-lg" />
      </div>
    </div>
  )
}
