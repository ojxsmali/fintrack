import { useId } from 'react'
import { Select } from './Field'
import { PERIOD_LABELS, type PeriodPreset } from '../../lib/periods'
import type { DateRange } from '../../types/finance'

export interface PeriodValue {
  preset: PeriodPreset | 'all'
  custom: DateRange
}

export function PeriodPicker({
  value,
  onChange,
  allowAll,
}: {
  value: PeriodValue
  onChange: (v: PeriodValue) => void
  allowAll?: boolean
}) {
  const id = useId()
  const presets = (Object.keys(PERIOD_LABELS) as PeriodPreset[])
  const invalid = value.preset === 'custom' && value.custom.from > value.custom.to
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="sr-only">
        Period
      </label>
      <Select id={id} value={value.preset} onChange={(e) => onChange({ ...value, preset: e.target.value as PeriodValue['preset'] })} className="w-full sm:w-44">
        {allowAll && <option value="all">All time</option>}
        {presets.map((p) => (
          <option key={p} value={p}>
            {PERIOD_LABELS[p]}
          </option>
        ))}
      </Select>
      {value.preset === 'custom' && (
        <fieldset className="flex w-full items-center gap-2 sm:w-auto">
          <legend className="sr-only">Custom date range</legend>
          <input
            type="date"
            aria-label="From"
            value={value.custom.from}
            max={value.custom.to}
            onChange={(e) => e.target.value && onChange({ ...value, custom: { ...value.custom, from: e.target.value } })}
            className="h-10 flex-1 rounded-sm border border-line-strong bg-surface px-2 text-sm"
          />
          <span className="text-ink-3 text-sm">to</span>
          <input
            type="date"
            aria-label="To"
            value={value.custom.to}
            min={value.custom.from}
            onChange={(e) => e.target.value && onChange({ ...value, custom: { ...value.custom, to: e.target.value } })}
            className="h-10 flex-1 rounded-sm border border-line-strong bg-surface px-2 text-sm"
          />
          {invalid && <span role="alert" className="text-xs text-negative">Start must be before end.</span>}
        </fieldset>
      )}
    </div>
  )
}
