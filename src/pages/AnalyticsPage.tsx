import { useMemo, useState } from 'react'
import { PageHeader } from '../components/layout/AppShell'
import { PeriodPicker, type PeriodValue } from '../components/ui/PeriodPicker'
import { Panel } from '../components/ui/Panel'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States'
import { BalanceChart, IncomeExpenseChart, SavingsRateChart } from '../components/charts/Charts'
import { WeekdayBars } from '../components/charts/WeekdayBars'
import { TransactionList } from '../components/transactions/TransactionList'
import { CategoryBars } from '../components/charts/CategoryBars'
import { useBalances, useCategories, useCurrency, useTransactionsInRange } from '../hooks/useFinance'
import {
  averageDailySpend,
  balanceSeries,
  filterRange,
  largestExpenses,
  monthlySeries,
  noSpendDays,
  percentChange,
  savingsRate,
  spendingByCategory,
  spendingByWeekday,
  topMerchants,
  totalBalance,
  totals,
} from '../lib/finance'
import { elapsedRange, previousPeriod, resolvePeriod, PERIOD_LABELS } from '../lib/periods'
import { addDays, fmt, monthKey, monthRange, parseISODate, toISODate } from '../lib/dates'
import { formatCurrency, formatPercent } from '../lib/format'
import type { Transaction } from '../types/finance'

export function AnalyticsPage() {
  const currency = useCurrency()
  const money = (n: number) => formatCurrency(n, currency)
  const [today] = useState(() => new Date())
  const [period, setPeriod] = useState<PeriodValue>(() => ({ preset: 'last_6_months', custom: monthRange(today) }))
  const range = useMemo(() => {
    const p = period.preset === 'all' ? 'last_6_months' : period.preset
    if (p === 'custom' && period.custom.from > period.custom.to) return resolvePeriod('this_month')
    return resolvePeriod(p, today, period.custom)
  }, [period, today])
  const prev = useMemo(() => previousPeriod(range), [range])
  // One fetch: the previous window, this window, and anything dated after it
  // (needed to walk the balance back from today's figure).
  const both = useMemo(() => ({ from: prev.from, to: '2100-12-31' }), [prev])
  const txs = useTransactionsInRange(both)
  const categories = useCategories()
  const balances = useBalances()

  const a = useMemo(() => {
    if (!txs.data || !categories.data || !balances.data) return null
    const cur = filterRange(txs.data, range)
    const before = filterRange(txs.data, prev)
    const t = totals(cur)
    const p = totals(before)
    const elapsed = elapsedRange(range)
    const prevByCat = new Map(spendingByCategory(before, categories.data).map((c) => [c.categoryId, c.amount]))
    const byCat = spendingByCategory(cur, categories.data)
    const months = monthlySeries(cur, range)
    const weekdays = spendingByWeekday(cur, elapsed)
    const peakDay = weekdays.reduce((x, y) => (y.average > x.average ? y : x), weekdays[0])
    return {
      balance: balanceSeries(totalBalance(balances.data), txs.data.filter((x) => x.occurred_on >= range.from), months.map((m) => m.key)),
      weekdays,
      peakDay,
      noSpend: noSpendDays(cur, elapsed),
      incomeByCat: spendingByCategory(cur, categories.data, 'income'),
      largest: largestExpenses(cur, 5),
      t,
      p,
      rate: savingsRate(t.income, t.expense),
      prevRate: savingsRate(p.income, p.expense),
      daily: averageDailySpend(t.expense, elapsed),
      prevDaily: averageDailySpend(p.expense, prev),
      byCat,
      catChanges: new Map(byCat.map((c) => [c.categoryId, percentChange(c.amount, prevByCat.get(c.categoryId) ?? 0)])),
      months,
      merchants: topMerchants(cur, 6),
      trends: categoryTrends(cur, byCat.slice(0, 5).map((c) => ({ id: c.categoryId, name: c.name })), months.map((m) => m.key)),
      count: cur.length,
      // Only compare when history actually reaches back to the start of the previous
      // window — otherwise a half-empty baseline produces meaningless +500% changes.
      hasPrev: before.length > 0 && before.reduce((m, t) => (t.occurred_on < m ? t.occurred_on : m), '9999') <= toISODate(addDays(parseISODate(prev.from), 14)),
    }
  }, [txs.data, categories.data, balances.data, range, prev])

  const periodLabel = period.preset === 'custom' ? `${fmt.day(range.from)} – ${fmt.day(range.to)}` : PERIOD_LABELS[period.preset === 'all' ? 'last_6_months' : period.preset].toLowerCase()

  return (
    <>
      <PageHeader title="Analytics" description="How your income and spending are changing over time." actions={<PeriodPicker value={period} onChange={setPeriod} />} />

      {txs.error && !a ? (
        <ErrorState error={txs.error} onRetry={() => txs.refetch()} />
      ) : !a ? (
        <div className="flex flex-col gap-6" aria-busy="true">
          <Skeleton className="h-20" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      ) : a.count === 0 ? (
        <EmptyState title="No transactions in this period." body="Choose a wider period, or add transactions to see how your money moves." />
      ) : (
        <div className={`flex flex-col gap-8 transition-opacity ${txs.isFetching ? 'opacity-70' : ''}`}>
          <section aria-label="Period summary" className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Kpi label="Income" value={money(a.t.income)} change={percentChange(a.t.income, a.p.income)} goodWhenUp hasPrev={a.hasPrev} />
            <Kpi label="Spending" value={money(a.t.expense)} change={percentChange(a.t.expense, a.p.expense)} hasPrev={a.hasPrev} />
            <Kpi label={a.t.net >= 0 ? 'Saved' : 'Overspent'} value={money(Math.abs(a.t.net))} tone={a.t.net < 0 ? 'text-negative' : undefined} />
            <Kpi
              label="Savings rate"
              value={formatPercent(a.rate, { digits: 0 })}
              note={a.hasPrev && a.rate !== null && a.prevRate !== null ? `${a.rate - a.prevRate >= 0 ? '+' : '−'}${Math.abs(Math.round(a.rate - a.prevRate))} pts vs previous` : undefined}
            />
            <Kpi label="Avg. daily spend" value={money(Math.round(a.daily))} change={percentChange(a.daily, a.prevDaily)} hasPrev={a.hasPrev} className="col-span-2 md:col-span-1" />
          </section>
          <p className="-mt-5 text-xs text-ink-3">
            {a.hasPrev ? <>Changes compare {periodLabel} with the {fmt.day(prev.from)} – {fmt.day(prev.to)} period before it. </> : <>Your history doesn’t reach back far enough to compare with the {fmt.day(prev.from)} – {fmt.day(prev.to)} period before this one. </>}Average daily spend counts days elapsed so far.
          </p>

          <section aria-label="Highlights" className="grid gap-0.5 overflow-hidden rounded-[18px] border-2 border-ink bg-ink shadow-[4px_4px_0_#16140f] sm:grid-cols-3">
            <Highlight
              label="Biggest spending day"
              value={a.peakDay.average > 0 ? `${FULL_DAY[a.peakDay.day]}s` : '—'}
              note={a.peakDay.average > 0 ? `${money(Math.round(a.peakDay.average))} on a typical ${FULL_DAY[a.peakDay.day]}` : 'No spending yet'}
            />
            <Highlight label="No-spend days" value={`${a.noSpend.days} of ${a.noSpend.of}`} note="Days with nothing spent, so far in this period" />
            <Highlight
              label="Largest category"
              value={a.byCat[0]?.name ?? '—'}
              note={a.byCat[0] ? `${formatPercent(a.byCat[0].share)} of spending · ${money(a.byCat[0].amount)}` : 'No spending yet'}
            />
          </section>

          {a.months.length > 1 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <IncomeExpenseChart
                data={a.months}
                currency={currency}
                summary={`You earned ${money(a.t.income)} and spent ${money(a.t.expense)} over ${a.months.length} months.`}
              />
              <SavingsRateChart
                data={a.months}
                summary={(() => {
                  const valid = a.months.filter((m) => m.savingsRate !== null)
                  if (!valid.length) return 'No income recorded in this period.'
                  const best = valid.reduce((x, y) => (y.savingsRate! > x.savingsRate! ? y : x))
                  return `Share of income kept each month. Best: ${fmt.monthOfKey(best.key)} at ${formatPercent(best.savingsRate, { digits: 0 })}.`
                })()}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {a.balance.length > 1 ? (
              <BalanceChart
                data={a.balance}
                currency={currency}
                summary={(() => {
                  const first = a.balance[0].balance
                  const last = a.balance[a.balance.length - 1].balance
                  const diff = last - first
                  return `Total balance at each month end. ${diff >= 0 ? 'Up' : 'Down'} ${money(Math.abs(diff))} since the end of ${fmt.monthOfKey(a.balance[0].key)}.`
                })()}
              />
            ) : (
              <Panel id="balance-single" title="Balance">
                <p className="num text-3xl font-medium tracking-[-0.03em]">{money(a.balance[0]?.balance ?? 0)}</p>
                <p className="mt-1 text-sm text-ink-3">At the end of this period. Pick a longer period to see the trend.</p>
              </Panel>
            )}
            <Panel id="weekday" title="When you spend" description="Average spending on each day of the week">
              <WeekdayBars data={a.weekdays} currency={currency} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel id="cat" title="Spending by category" description={a.hasPrev ? 'Arrows compare with the previous period' : undefined}>
              {a.byCat.length ? <CategoryBars data={a.byCat} currency={currency} limit={8} changes={a.hasPrev ? a.catChanges : undefined} /> : <p className="text-sm text-ink-3">No spending in this period.</p>}
            </Panel>
            <div className="flex min-w-0 flex-col gap-6">
            <Panel id="income-sources" title="Where income comes from">
              {a.incomeByCat.length ? <CategoryBars data={a.incomeByCat} currency={currency} limit={4} /> : <p className="text-sm text-ink-3">No income in this period.</p>}
            </Panel>
            <Panel id="merchants" title="Top merchants" description="Where the most money went">
              {a.merchants.length ? (
                <ol className="flex flex-col divide-y divide-line">
                  {a.merchants.map((m, i) => (
                    <li key={m.merchant} className="flex items-baseline gap-3 py-2.5 text-sm first:pt-0">
                      <span className="num w-4 text-xs text-ink-4">{i + 1}</span>
                      <span className="flex-1 truncate text-ink">{m.merchant}</span>
                      <span className="text-xs text-ink-3">
                        {m.count} {m.count === 1 ? 'payment' : 'payments'}
                      </span>
                      <span className="num w-24 text-right font-medium">{money(m.amount)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-3">No spending in this period.</p>
              )}
            </Panel>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {a.months.length > 1 && a.trends.length > 0 && (
            <Panel id="trends" title="Category trends" description="Monthly spending in your five largest categories. Each row is scaled to its own peak.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <caption className="sr-only">Monthly spending per category</caption>
                  <thead>
                    <tr className="text-left text-xs text-ink-3">
                      <th scope="col" className="pb-2 font-medium">Category</th>
                      <th scope="col" className="pb-2 font-medium">
                        <span className="sr-only">Trend</span>
                        <span aria-hidden className="flex justify-between">
                          <span>{fmt.monthOfKey(a.months[0].key)}</span>
                          <span>{fmt.monthOfKey(a.months[a.months.length - 1].key)}</span>
                        </span>
                      </th>
                      <th scope="col" className="pb-2 text-right font-medium">Monthly avg.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.trends.map((row) => (
                      <tr key={row.name} className="border-t border-line">
                        <th scope="row" className="py-3 pr-4 text-left font-normal text-ink">
                          {row.name}
                        </th>
                        <td className="w-1/2 py-3">
                          <Spark values={row.values} labels={a.months.map((m) => fmt.monthOfKey(m.key))} money={money} />
                        </td>
                        <td className="num py-3 text-right font-medium">{money(Math.round(row.avg))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
            <Panel id="largest" title="Largest expenses" description="Biggest single payment per merchant · tap to open">
              {a.largest.length ? <TransactionList txs={a.largest} categories={categories.data ?? []} /> : <p className="text-sm text-ink-3">No spending in this period.</p>}
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}

function categoryTrends(txs: Transaction[], cats: { id: string; name: string }[], months: string[]) {
  return cats.map((c) => {
    const values = months.map((k) =>
      txs.filter((t) => t.type === 'expense' && t.category_id === c.id && monthKey(t.occurred_on) === k).reduce((n, t) => n + t.amount, 0),
    )
    return { name: c.name, values, avg: values.reduce((n, v) => n + v, 0) / Math.max(values.length, 1) }
  })
}

function Spark({ values, labels, money }: { values: number[]; labels: string[]; money: (n: number) => string }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex h-8 items-end gap-[3px]" role="list">
      {values.map((v, i) => (
        <div
          key={i}
          role="listitem"
          aria-label={`${labels[i]}: ${money(v)}`}
          title={`${labels[i]}: ${money(v)}`}
          className="flex-1 rounded-t-[3px] bg-accent-muted transition-colors hover:bg-accent last:bg-accent"
          style={{ height: `${Math.max((v / max) * 100, v > 0 ? 6 : 2)}%` }}
        />
      ))}
    </div>
  )
}

function Kpi({
  label,
  value,
  change,
  goodWhenUp,
  hasPrev = true,
  note,
  tone,
  className = '',
}: {
  label: string
  value: string
  change?: number | null
  goodWhenUp?: boolean
  hasPrev?: boolean
  note?: string
  tone?: string
  className?: string
}) {
  const showChange = change !== undefined
  const good = change != null && (goodWhenUp ? change >= 0 : change <= 0)
  return (
    <div className={`rounded-[18px] border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_#16140f] ${className}`}>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</p>
      <p className={`num mt-2 font-display text-xl font-extrabold tracking-[-0.04em] sm:text-2xl ${tone ?? 'text-ink'}`}>{value}</p>
      {showChange && (
        <p className={`num mt-0.5 text-xs ${change == null || !hasPrev ? 'text-ink-4' : good ? 'text-positive' : 'text-caution'}`}>
          {!hasPrev ? 'Not enough history to compare' : change == null ? 'No baseline' : `${change >= 0 ? '↑' : '↓'} ${formatPercent(Math.abs(change), { digits: 0 })} vs previous`}
        </p>
      )}
      {note && <p className="num mt-0.5 text-xs text-ink-3">{note}</p>}
    </div>
  )
}

const FULL_DAY: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }

function Highlight({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-1 font-display text-lg font-extrabold tracking-[-0.03em] text-ink">{value}</p>
      <p className="num mt-0.5 text-xs text-ink-3">{note}</p>
    </div>
  )
}
