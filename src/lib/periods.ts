import type { DateRange } from '../types/finance'
import { addDays, addMonths, daysBetween, endOfMonth, parseISODate, startOfMonth, toISODate } from './dates'

export type PeriodPreset = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'custom'

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  last_3_months: 'Last 3 months',
  last_6_months: 'Last 6 months',
  this_year: 'This year',
  custom: 'Custom range',
}

/** Multi-month presets include the current month. */
export function resolvePeriod(preset: PeriodPreset, now = new Date(), custom?: DateRange): DateRange {
  switch (preset) {
    case 'this_month':
      return { from: toISODate(startOfMonth(now)), to: toISODate(endOfMonth(now)) }
    case 'last_month': {
      const s = addMonths(now, -1)
      return { from: toISODate(s), to: toISODate(endOfMonth(s)) }
    }
    case 'last_3_months':
      return { from: toISODate(addMonths(now, -2)), to: toISODate(endOfMonth(now)) }
    case 'last_6_months':
      return { from: toISODate(addMonths(now, -5)), to: toISODate(endOfMonth(now)) }
    case 'this_year':
      return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` }
    case 'custom':
      return custom ?? resolvePeriod('this_month', now)
  }
}

/** The equally-long window immediately before `range`, for "vs previous period". */
export function previousPeriod(range: DateRange): DateRange {
  const from = parseISODate(range.from)
  const to = parseISODate(range.to)
  // Whole-month ranges compare against the same number of whole months.
  const isWholeMonths = from.getDate() === 1 && toISODate(endOfMonth(to)) === range.to
  if (isWholeMonths) {
    const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1
    const start = addMonths(from, -months)
    return { from: toISODate(start), to: toISODate(addDays(from, -1)) }
  }
  const len = daysBetween(range)
  return { from: toISODate(addDays(from, -len)), to: toISODate(addDays(from, -1)) }
}

/** Clamp a range's end to today so "days elapsed" math is honest mid-period. */
export function elapsedRange(range: DateRange, now = new Date()): DateRange {
  const t = toISODate(now)
  return { from: range.from, to: range.to > t ? (t < range.from ? range.from : t) : range.to }
}
