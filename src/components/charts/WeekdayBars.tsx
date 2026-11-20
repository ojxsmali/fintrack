import type { WeekdaySpend } from '../../lib/finance'
import { formatCurrency } from '../../lib/format'

/**
 * Average spend on a typical Monday…Sunday. Plain HTML bars: seven values,
 * one hue, the peak day emphasised and labelled — no legend needed.
 */
export function WeekdayBars({ data, currency }: { data: WeekdaySpend[]; currency: string }) {
  const max = Math.max(...data.map((d) => d.average), 1)
  const peak = data.reduce((a, b) => (b.average > a.average ? b : a), data[0])
  return (
    <div>
      <ul className="grid h-40 grid-cols-7 items-end gap-2" aria-label="Average spending by day of week">
        {data.map((d) => {
          const isPeak = d === peak && d.average > 0
          return (
            <li key={d.day} className="flex h-full flex-col items-center justify-end gap-1.5" aria-label={`${d.day}: ${formatCurrency(Math.round(d.average), currency)} on average`}>
              <span className={`num text-[10.5px] ${isPeak ? 'font-semibold text-ink' : 'text-ink-3'}`}>{formatCurrency(Math.round(d.average), currency, { compact: true })}</span>
              <div
                className={`w-full max-w-9 rounded-t-[4px] transition-colors ${isPeak ? 'bg-accent' : 'bg-accent-muted/70 hover:bg-accent-muted'}`}
                style={{ height: `${Math.max((d.average / max) * 100, d.average > 0 ? 4 : 1)}%` }}
                title={`${d.day}: ${formatCurrency(d.average, currency)} average over ${d.occurrences} ${d.day}s`}
              />
              <span className={`text-xs ${isPeak ? 'font-semibold text-ink' : 'text-ink-3'}`}>{d.day}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
