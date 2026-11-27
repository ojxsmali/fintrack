import type { CategorySpend } from '../../lib/finance'
import { formatCurrency, formatPercent } from '../../lib/format'

/**
 * Horizontal bars beat a donut here: category names sit next to exact values,
 * lengths are compared on a common baseline, and it reads on a 320px phone.
 * Single hue — the label carries identity, so colour doesn't have to.
 */
export function CategoryBars({
  data,
  currency,
  limit = 6,
  changes,
}: {
  data: CategorySpend[]
  currency: string
  limit?: number
  /** Optional % change per category vs a comparison period. */
  changes?: Map<string, number | null>
}) {
  const shown = data.slice(0, limit)
  const rest = data.slice(limit)
  const restTotal = rest.reduce((n, c) => n + c.amount, 0)
  const rows = restTotal > 0 ? [...shown, { categoryId: 'rest', name: `${rest.length} more`, amount: restTotal, share: rest.reduce((n, c) => n + c.share, 0), count: 0 }] : shown
  const max = Math.max(...rows.map((r) => r.amount), 1)

  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((c) => {
        const change = changes?.get(c.categoryId)
        return (
          <li key={c.categoryId}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className={c.categoryId === 'rest' ? 'text-ink-3' : 'text-ink'}>{c.name}</span>
              <span className="flex items-baseline gap-2">
                {change !== undefined && change !== null && (
                  <span className={`num text-xs ${change > 0 ? 'text-caution' : 'text-positive'}`} title="vs previous period">
                    {change > 0 ? '↑' : '↓'} {formatPercent(Math.abs(change))}
                  </span>
                )}
                <span className="num font-medium text-ink">{formatCurrency(c.amount, currency)}</span>
                <span className="num w-10 text-right text-xs text-ink-3">{formatPercent(c.share, { digits: 0 })}</span>
              </span>
            </div>
            <div className="h-3.5 overflow-hidden rounded-full border-2 border-ink bg-sunken" aria-hidden>
              <div
                className={`h-full rounded-r-full ${c.categoryId === 'rest' ? 'bg-ink-4' : 'bg-accent'}`}
                style={{ width: `${Math.max((c.amount / max) * 100, 1.5)}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
