import type { DateRange, ISODate } from '../types/finance'

/** Dates are handled as local calendar days (YYYY-MM-DD) — no time-zone drift. */
export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = parseISODate(s)
  return toISODate(d) === s
}

export function today(): ISODate {
  return toISODate(new Date())
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}
export function daysInMonth(d: Date): number {
  return endOfMonth(d).getDate()
}

/** Inclusive day count between two ISO dates. */
export function daysBetween(range: DateRange): number {
  const ms = parseISODate(range.to).getTime() - parseISODate(range.from).getTime()
  return Math.round(ms / 86_400_000) + 1
}

export function monthRange(d: Date): DateRange {
  return { from: toISODate(startOfMonth(d)), to: toISODate(endOfMonth(d)) }
}

export function monthKey(s: ISODate): string {
  return s.slice(0, 7)
}

export function inRange(s: ISODate, r: DateRange): boolean {
  return s >= r.from && s <= r.to
}

const monthFmt = new Intl.DateTimeFormat('en-IN', { month: 'long' })
const monthShortFmt = new Intl.DateTimeFormat('en-IN', { month: 'short' })
const monthYearFmt = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' })
const dayFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const fullFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const fmt = {
  month: (d: Date) => monthFmt.format(d),
  monthShort: (d: Date) => monthShortFmt.format(d),
  monthYear: (d: Date) => monthYearFmt.format(d),
  /** "18 Nov" */
  day: (s: ISODate) => dayFmt.format(parseISODate(s)),
  full: (s: ISODate) => fullFmt.format(parseISODate(s)),
  monthOfKey: (key: string) => monthShortFmt.format(parseISODate(`${key}-01`)),
}

/** "Today", "Yesterday", or "18 Nov" — used for list grouping. */
export function relativeDayLabel(s: ISODate, now = new Date()): string {
  const t = toISODate(now)
  if (s === t) return 'Today'
  if (s === toISODate(addDays(now, -1))) return 'Yesterday'
  const d = parseISODate(s)
  return d.getFullYear() === now.getFullYear() ? dayFmt.format(d) : monthYearFmt.format(d)
}
