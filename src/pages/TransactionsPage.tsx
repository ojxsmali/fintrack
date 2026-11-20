import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Search, X } from 'lucide-react'
import { PageHeader } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Field'
import { Segmented } from '../components/ui/Segmented'
import { PeriodPicker, type PeriodValue } from '../components/ui/PeriodPicker'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States'
import { TxAmount } from '../components/ui/Money'
import { TransactionList } from '../components/transactions/TransactionList'
import { useTransactionEditor } from '../components/transactions/TransactionEditor'
import { useAccounts, useCategories, useTransactionCount, useTransactionPage } from '../hooks/useFinance'
import { useExportCsv } from '../hooks/useExportCsv'
import { resolvePeriod } from '../lib/periods'
import { fmt, monthRange } from '../lib/dates'
import type { SortKey, TransactionQuery, TxType } from '../types/finance'

const PAGE_SIZE = 25

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function TransactionsPage() {
  const editor = useTransactionEditor()
  const { data: categories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()
  const totalCount = useTransactionCount()
  const exportCsv = useExportCsv()

  const [search, setSearch] = useState('')
  const [type, setType] = useState<TxType | 'all'>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [period, setPeriod] = useState<PeriodValue>({ preset: 'all', custom: monthRange(new Date()) })
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [page, setPage] = useState(1)
  const q = useDebounced(search)

  const range = useMemo(() => {
    if (period.preset === 'all') return undefined
    if (period.preset === 'custom' && period.custom.from > period.custom.to) return undefined
    return resolvePeriod(period.preset, new Date(), period.custom)
  }, [period])

  const query: TransactionQuery = { search: q, type, categoryId, range, sort, page, pageSize: PAGE_SIZE }
  useEffect(() => setPage(1), [q, type, categoryId, range?.from, range?.to, sort])

  const { data, isLoading, error, refetch, isFetching } = useTransactionPage(query)
  const filtersActive = !!q || type !== 'all' || categoryId !== 'all' || period.preset !== 'all'
  const catOptions = categories.filter((c) => type === 'all' || c.kind === type)
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]))

  const clear = () => {
    setSearch('')
    setType('all')
    setCategoryId('all')
    setPeriod({ ...period, preset: 'all' })
  }

  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  return (
    <>
      <PageHeader
        title="Transactions"
        description={totalCount.data !== undefined ? `${totalCount.data.toLocaleString('en-IN')} recorded in total` : undefined}
        actions={
          <>
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => exportCsv.run()} loading={exportCsv.pending} disabled={!totalCount.data}>
              Export CSV
            </Button>
            <Button icon={<Plus size={16} />} onClick={() => editor.create()} className="max-md:hidden">
              Add transaction
            </Button>
          </>
        }
      />

      {/* Filters: one row on desktop, stacked on phones */}
      <div role="search" className="mb-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative lg:w-64">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input aria-label="Search transactions" placeholder="Search merchant or note" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" type="search" />
        </div>
        <Segmented
          label="Type"
          value={type}
          onChange={(v) => {
            setType(v)
            if (v !== 'all' && categories.find((c) => c.id === categoryId)?.kind !== v) setCategoryId('all')
          }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'expense', label: 'Spending' },
            { value: 'income', label: 'Income' },
          ]}
          className="w-full sm:w-auto"
        />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Select aria-label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="sm:w-44">
            <option value="all">All categories</option>
            {catOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="sm:w-44">
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Largest amount</option>
            <option value="amount_asc">Smallest amount</option>
          </Select>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} allowAll />
        {filtersActive && (
          <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={clear} className="self-start lg:self-auto">
            Clear filters
          </Button>
        )}
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading transactions">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : data.rows.length === 0 ? (
        totalCount.data === 0 ? (
          <EmptyState
            title="No transactions yet."
            body="Add your first transaction to start understanding your spending."
            action={<Button onClick={() => editor.create()}>Add transaction</Button>}
          />
        ) : (
          <EmptyState title="Nothing matches these filters." body="Try a different search term or widen the date range." action={<Button variant="secondary" onClick={clear}>Clear filters</Button>} />
        )
      ) : (
        <div className={`transition-opacity duration-[var(--duration-base)] ${isFetching ? 'opacity-70' : ''}`}>
          {/* Phone & small tablet: grouped list */}
          <div className="md:hidden">
            <TransactionList txs={data.rows} categories={categories} groupByDay={sort.startsWith('date')} />
          </div>
          {/* Tablet+: table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Transactions, {sort.startsWith('date') ? 'by date' : 'by amount'}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-3">
                  <th scope="col" className="w-24 py-2.5 font-medium">Date</th>
                  <th scope="col" className="py-2.5 font-medium">Merchant</th>
                  <th scope="col" className="py-2.5 font-medium">Category</th>
                  <th scope="col" className="hidden py-2.5 font-medium lg:table-cell">Account</th>
                  <th scope="col" className="py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((t) => (
                  <tr
                    key={t.id}
                    tabIndex={0}
                    onClick={() => editor.open(t)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        editor.open(t)
                      }
                    }}
                    aria-label={`${t.merchant}, ${t.type === 'income' ? 'income' : 'expense'} on ${fmt.day(t.occurred_on)}. Open details`}
                    className="cursor-pointer border-b border-line/70 transition-colors duration-[var(--duration-fast)] hover:bg-sunken/60 focus-visible:bg-sunken/60"
                  >
                    <td className="num py-3 text-ink-3">{fmt.day(t.occurred_on)}</td>
                    <td className="py-3 pr-4">
                      <span className="font-medium text-ink">{t.merchant}</span>
                      {t.description && <span className="ml-2 text-ink-3">{t.description}</span>}
                      {t.is_sample && <span className="ml-2 rounded-xs bg-sunken px-1 py-px text-2xs text-ink-3">sample</span>}
                    </td>
                    <td className="py-3 text-ink-2">{names.get(t.category_id) ?? '—'}</td>
                    <td className="hidden py-3 text-ink-3 lg:table-cell">{accountNames.get(t.account_id) ?? '—'}</td>
                    <td className="py-3 text-right font-medium">
                      <TxAmount amount={t.amount} type={t.type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4 text-sm">
            <p className="num text-ink-3" aria-live="polite">
              {start}–{end} of {total.toLocaleString('en-IN')}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
