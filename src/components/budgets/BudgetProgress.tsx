import { CircleCheck, CircleAlert, TriangleAlert } from 'lucide-react'
import type { BudgetStatus } from '../../lib/finance'
import { formatCurrency, formatPercent } from '../../lib/format'

const STATE = {
  healthy: { label: 'On track', bar: 'bg-accent', text: 'text-ink-3', Icon: CircleCheck },
  approaching: { label: 'Close to limit', bar: 'bg-tangerine', text: 'text-caution', Icon: CircleAlert },
  exceeded: { label: 'Over budget', bar: 'bg-negative', text: 'text-negative', Icon: TriangleAlert },
} as const

/**
 * Over-budget is stated plainly (icon + words + amount over) but not shouted:
 * no red backgrounds, the bar simply caps at 100% with an overflow marker.
 */
export function BudgetProgress({ status, currency, dense }: { status: BudgetStatus; currency: string; dense?: boolean }) {
  const s = STATE[status.state]
  const pct = Math.min(status.percent, 100)
  const money = (n: number) => formatCurrency(n, currency)
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{status.categoryName}</span>
        <span className="num text-ink-2">
          <span className="font-medium text-ink">{money(status.spent)}</span>
          <span className="text-ink-3"> / {money(status.limit)}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${status.categoryName} budget`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={`${formatPercent(status.percent, { digits: 0 })} used, ${s.label}`}
        className="relative h-3.5 overflow-hidden rounded-full border-2 border-ink bg-sunken"
      >
        <div className={`h-full rounded-r-full ${s.bar} transition-[width] duration-700 ease-[var(--ease-spring)]`} style={{ width: `${pct}%` }} />
      </div>
      {!dense || status.state !== 'healthy' ? (
        <p className={`mt-1.5 flex items-center gap-1 text-xs ${s.text}`}>
          <s.Icon size={13} aria-hidden />
          {status.state === 'exceeded'
            ? `${money(-status.remaining)} over`
            : status.state === 'approaching'
              ? `${money(status.remaining)} left · ${formatPercent(status.percent, { digits: 0 })} used`
              : `${money(status.remaining)} left`}
        </p>
      ) : null}
    </div>
  )
}
