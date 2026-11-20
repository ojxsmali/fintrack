import type { Category, Transaction } from '../../types/finance'
import { fmt, relativeDayLabel } from '../../lib/dates'
import { TxAmount } from '../ui/Money'
import { useTransactionEditor } from './TransactionEditor'

/** Neutral monogram — identifies the merchant without colourful icon noise. */
function Monogram({ name, income }: { name: string; income: boolean }) {
  const letter = name.trim().charAt(0).toUpperCase() || '·'
  return (
    <span
      aria-hidden
      className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-medium ${income ? 'bg-positive-soft text-positive' : 'bg-sunken text-ink-2'}`}
    >
      {letter}
    </span>
  )
}

export function TransactionRow({ tx, categoryName, showDate = true }: { tx: Transaction; categoryName: string; showDate?: boolean }) {
  const editor = useTransactionEditor()
  return (
    <li>
      <button
        type="button"
        onClick={() => editor.open(tx)}
        className="group flex w-full items-center gap-3 rounded-md px-2 py-2.5 -mx-2 text-left transition-colors duration-[var(--duration-fast)] hover:bg-sunken/70 w-[calc(100%+1rem)]"
      >
        <Monogram name={tx.merchant} income={tx.type === 'income'} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{tx.merchant}</span>
          <span className="block truncate text-xs text-ink-3">
            {categoryName}
            {showDate && <> · {fmt.day(tx.occurred_on)}</>}
            {tx.description && <span className="hidden sm:inline"> · {tx.description}</span>}
          </span>
        </span>
        <TxAmount amount={tx.amount} type={tx.type} className="text-sm font-medium" />
      </button>
    </li>
  )
}

export function TransactionList({ txs, categories, groupByDay }: { txs: Transaction[]; categories: Category[]; groupByDay?: boolean }) {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  if (!groupByDay) {
    return (
      <ul className="flex flex-col">
        {txs.map((t) => (
          <TransactionRow key={t.id} tx={t} categoryName={names.get(t.category_id) ?? '—'} />
        ))}
      </ul>
    )
  }
  const groups: { day: string; items: Transaction[] }[] = []
  for (const t of txs) {
    const g = groups[groups.length - 1]
    if (g && g.day === t.occurred_on) g.items.push(t)
    else groups.push({ day: t.occurred_on, items: [t] })
  }
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.day} aria-label={fmt.full(g.day)}>
          <h3 className="mb-1 text-xs font-medium text-ink-3">{relativeDayLabel(g.day)}</h3>
          <ul className="flex flex-col">
            {g.items.map((t) => (
              <TransactionRow key={t.id} tx={t} categoryName={names.get(t.category_id) ?? '—'} showDate={false} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
