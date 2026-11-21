import { useState, type ReactNode } from 'react'
import { Panel } from '../ui/Panel'


export interface LegendItem {
  label: string
  color: string
  dashed?: boolean
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden>
            <line x1="1" y1="4" x2="15" y2="4" stroke={i.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={i.dashed ? '3 3' : undefined} />
          </svg>
          {i.label}
        </li>
      ))}
    </ul>
  )
}

/**
 * Every chart: a one-sentence summary (read by screen readers and visible to all),
 * a legend when there are ≥2 series, and a "View as table" alternative.
 */
export function ChartFrame({
  id,
  title,
  summary,
  legend,
  table,
  children,
  action,
  height = 240,
}: {
  id: string
  title: string
  summary: ReactNode
  legend?: LegendItem[]
  table: { columns: string[]; rows: (string | number)[][] }
  children: ReactNode
  action?: ReactNode
  height?: number
}) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Panel
      id={id}
      title={title}
      description={summary}
      action={
        <div className="flex items-center gap-2">
          {action}
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            className="shrink-0 rounded-xs px-1.5 py-1 text-xs font-medium text-ink-3 hover:text-ink hover:bg-sunken"
          >
            {asTable ? 'View chart' : 'View table'}
          </button>
        </div>
      }
    >
      {legend && legend.length > 1 && !asTable && (
        <div className="mb-3">
          <Legend items={legend} />
        </div>
      )}
      {asTable ? (
        <div className="max-h-[320px] overflow-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-3">
                {table.columns.map((c, i) => (
                  <th key={c} scope="col" className={`py-2 font-medium ${i > 0 ? 'text-right' : ''}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={ri} className="border-b border-line/70 last:border-0">
                  {r.map((cell, ci) => (
                    <td key={ci} className={`py-2 ${ci > 0 ? 'num text-right text-ink' : 'text-ink-2'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height }} role="img" aria-label={`${title}. ${typeof summary === 'string' ? summary : ''}`} className="-ml-2">
          {children}
        </div>
      )}
    </Panel>
  )
}

/** Shared tooltip shell for Recharts. */
export function TooltipCard({ title, rows }: { title: string; rows: { label: string; value: string; color?: string; dashed?: boolean }[] }) {
  return (
    <div className="min-w-40 rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-overlay)]">
      <p className="mb-1.5 font-medium text-ink">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-3">
            {r.color && (
              <svg width="12" height="8" aria-hidden>
                <line x1="1" y1="4" x2="11" y2="4" stroke={r.color} strokeWidth="2.5" strokeDasharray={r.dashed ? '2 2' : undefined} />
              </svg>
            )}
            {r.label}
          </span>
          <span className="num font-medium text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  )
}
