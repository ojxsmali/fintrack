import { useState } from 'react'
import type { Insight } from '../../lib/insights'

const DOT: Record<Insight['tone'], string> = {
  positive: 'bg-positive',
  neutral: 'bg-ink-4',
  attention: 'bg-caution',
}
const TONE_LABEL: Record<Insight['tone'], string> = { positive: 'Good news', neutral: 'Note', attention: 'Needs attention' }

/** Each insight can reveal the exact numbers behind it. */
export function InsightList({ insights }: { insights: Insight[] }) {
  const [open, setOpen] = useState<string | null>(null)
  if (!insights.length)
    return <p className="text-sm text-ink-3">Nothing stands out yet. Insights appear once there’s enough history to compare — usually after a full month.</p>
  return (
    <ul className="flex flex-col divide-y divide-line">
      {insights.map((i) => (
        <li key={i.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex gap-3">
            <span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${DOT[i.tone]}`} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-ink">
                <span className="sr-only">{TONE_LABEL[i.tone]}: </span>
                {i.text}
              </p>
              <button
                type="button"
                className="mt-0.5 text-xs text-ink-3 hover:text-ink"
                aria-expanded={open === i.id}
                onClick={() => setOpen(open === i.id ? null : i.id)}
              >
                {open === i.id ? 'Hide basis' : 'Show basis'}
              </button>
              {open === i.id && <p className="mt-1 text-xs text-ink-2">{i.basis}</p>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
