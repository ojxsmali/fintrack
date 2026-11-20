/**
 * Pure financial calculations. No React, no I/O — everything here is unit tested.
 * Every function returns `null` instead of NaN/Infinity when a ratio is undefined
 * (e.g. savings rate with zero income), and the UI renders null as "—".
 */
import type { AccountBalance, Budget, Category, DateRange, ISODate, Transaction } from '../types/finance'
import { addMonths, daysBetween, monthKey, parseISODate, toISODate } from './dates'

/** Sum in integer paise to avoid floating-point drift, then convert back. */
function sum(values: number[]): number {
  let paise = 0
  for (const v of values) paise += Math.round(v * 100)
  return paise / 100
}

export interface Totals {
  income: number
  expense: number
  /** income − expense. Positive = saved, negative = overspent. */
  net: number
}

export function totals(txs: Transaction[]): Totals {
  const income = sum(txs.filter((t) => t.type === 'income').map((t) => t.amount))
  const expense = sum(txs.filter((t) => t.type === 'expense').map((t) => t.amount))
  return { income, expense, net: sum([income, -expense]) }
}

export function filterRange(txs: Transaction[], r: DateRange): Transaction[] {
  return txs.filter((t) => t.occurred_on >= r.from && t.occurred_on <= r.to)
}

/** Savings rate = (income − expense) / income × 100. Undefined without income. */
export function savingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null
  return ((income - expense) / income) * 100
}

/** (current − previous) / previous × 100. Undefined when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

/** Total balance = Σ starting balances + Σ income − Σ expenses, across all accounts. */
export function totalBalance(accounts: AccountBalance[]): number {
  return sum(accounts.map((a) => a.balance))
}

export function averageDailySpend(expense: number, range: DateRange): number {
  const days = daysBetween(range)
  return days > 0 ? expense / days : 0
}

export interface CategorySpend {
  categoryId: string
  name: string
  amount: number
  /** share of total for the same type, 0–100 */
  share: number
  count: number
}

export function spendingByCategory(txs: Transaction[], categories: Category[], type: 'expense' | 'income' = 'expense'): CategorySpend[] {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const groups = new Map<string, number[]>()
  for (const t of txs) {
    if (t.type !== type) continue
    const g = groups.get(t.category_id) ?? []
    g.push(t.amount)
    groups.set(t.category_id, g)
  }
  const total = sum([...groups.values()].flat())
  return [...groups.entries()]
    .map(([categoryId, amounts]) => {
      const amount = sum(amounts)
      return {
        categoryId,
        name: names.get(categoryId) ?? 'Uncategorised',
        amount,
        share: total > 0 ? (amount / total) * 100 : 0,
        count: amounts.length,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

// ───────────────────────────── budgets ─────────────────────────────

export type BudgetState = 'healthy' | 'approaching' | 'exceeded'
export const APPROACHING_THRESHOLD = 80

export interface BudgetStatus {
  budget: Budget
  categoryName: string
  spent: number
  limit: number
  remaining: number
  /** spent / limit × 100 (can exceed 100) */
  percent: number
  state: BudgetState
}

export function budgetState(percent: number): BudgetState {
  if (percent > 100) return 'exceeded'
  if (percent >= APPROACHING_THRESHOLD) return 'approaching'
  return 'healthy'
}

export function budgetStatuses(budgets: Budget[], monthTxs: Transaction[], categories: Category[]): BudgetStatus[] {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  return budgets
    .map((b) => {
      const spent = sum(monthTxs.filter((t) => t.type === 'expense' && t.category_id === b.category_id).map((t) => t.amount))
      const percent = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0
      return {
        budget: b,
        categoryName: names.get(b.category_id) ?? 'Unknown',
        spent,
        limit: b.monthly_limit,
        remaining: sum([b.monthly_limit, -spent]),
        percent,
        state: budgetState(percent),
      }
    })
    .sort((a, b) => b.percent - a.percent)
}

/** Overall budget usage = Σ spent in budgeted categories / Σ limits × 100. */
export function overallBudgetUsage(statuses: BudgetStatus[]): number | null {
  const limit = sum(statuses.map((s) => s.limit))
  if (limit <= 0) return null
  return (sum(statuses.map((s) => s.spent)) / limit) * 100
}

// ───────────────────────────── series ──────────────────────────────

export interface MonthPoint {
  key: string // YYYY-MM
  income: number
  expense: number
  net: number
  savingsRate: number | null
}

/** One point per calendar month in [fromMonth, toMonth], including empty months. */
export function monthlySeries(txs: Transaction[], range: DateRange): MonthPoint[] {
  const out: MonthPoint[] = []
  const end = monthKey(range.to)
  for (let d = parseISODate(`${monthKey(range.from)}-01`); toISODate(d).slice(0, 7) <= end; d = addMonths(d, 1)) {
    const key = toISODate(d).slice(0, 7)
    const t = totals(txs.filter((x) => monthKey(x.occurred_on) === key))
    out.push({ key, ...t, savingsRate: savingsRate(t.income, t.expense) })
  }
  return out
}

export interface PacePoint {
  day: number
  current: number | null
  previous: number | null
}

/**
 * Cumulative spending by day-of-month for the current and previous month.
 * Current-month points stop at `todayDay` so the line doesn't flat-line into the future.
 */
export function cumulativePace(
  current: Transaction[],
  previous: Transaction[],
  daysCurrent: number,
  daysPrevious: number,
  todayDay: number,
): PacePoint[] {
  const byDay = (txs: Transaction[]) => {
    const m = new Map<number, number>()
    for (const t of txs) {
      if (t.type !== 'expense') continue
      const d = Number(t.occurred_on.slice(8, 10))
      m.set(d, (m.get(d) ?? 0) + Math.round(t.amount * 100))
    }
    return m
  }
  const c = byDay(current)
  const p = byDay(previous)
  const len = Math.max(daysCurrent, daysPrevious)
  const out: PacePoint[] = []
  let ca = 0
  let pa = 0
  for (let day = 1; day <= len; day++) {
    ca += c.get(day) ?? 0
    pa += p.get(day) ?? 0
    out.push({
      day,
      current: day <= Math.min(todayDay, daysCurrent) ? ca / 100 : null,
      previous: day <= daysPrevious ? pa / 100 : null,
    })
  }
  return out
}

/** Spending up to (and including) a day-of-month — for like-for-like month comparisons. */
export function spendThroughDay(txs: Transaction[], day: number): number {
  return sum(txs.filter((t) => t.type === 'expense' && Number(t.occurred_on.slice(8, 10)) <= day).map((t) => t.amount))
}

export interface MerchantSpend {
  merchant: string
  amount: number
  count: number
}

export function topMerchants(txs: Transaction[], limit = 5): MerchantSpend[] {
  const m = new Map<string, { label: string; cents: number; count: number }>()
  for (const t of txs) {
    if (t.type !== 'expense') continue
    const key = t.merchant.trim().toLowerCase()
    const e = m.get(key) ?? { label: t.merchant.trim(), cents: 0, count: 0 }
    e.cents += Math.round(t.amount * 100)
    e.count += 1
    m.set(key, e)
  }
  return [...m.values()]
    .map((e) => ({ merchant: e.label, amount: e.cents / 100, count: e.count }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

export function largestExpense(txs: Transaction[]): Transaction | null {
  let best: Transaction | null = null
  for (const t of txs) if (t.type === 'expense' && (!best || t.amount > best.amount)) best = t
  return best
}

export function dayOfMonth(s: ISODate): number {
  return Number(s.slice(8, 10))
}

// ─────────────────────────── analytics extras ───────────────────────────

export interface BalancePoint {
  key: string // YYYY-MM
  balance: number
}

/**
 * Balance at each month's end = today's total balance − the net of every
 * transaction dated after that month end. `txs` must include everything from the
 * first month onwards (including anything dated later), or earlier points drift.
 */
export function balanceSeries(currentBalance: number, txs: Transaction[], monthKeys: string[]): BalancePoint[] {
  return monthKeys.map((key) => {
    const end = toISODate(new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0))
    let after = 0
    for (const t of txs) if (t.occurred_on > end) after += (t.type === 'income' ? 1 : -1) * Math.round(t.amount * 100)
    return { key, balance: (Math.round(currentBalance * 100) - after) / 100 }
  })
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export interface WeekdaySpend {
  day: (typeof WEEKDAYS)[number]
  total: number
  /** total ÷ number of that weekday in the range — a typical Monday, Tuesday… */
  average: number
  occurrences: number
}

/** Spending per weekday (Monday first), averaged over how many of each weekday the range contains. */
export function spendingByWeekday(txs: Transaction[], range: DateRange): WeekdaySpend[] {
  const totals = new Array(7).fill(0)
  const counts = new Array(7).fill(0)
  for (let d = parseISODate(range.from); toISODate(d) <= range.to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    counts[(d.getDay() + 6) % 7] += 1
  }
  for (const t of txs) {
    if (t.type !== 'expense' || t.occurred_on < range.from || t.occurred_on > range.to) continue
    totals[(parseISODate(t.occurred_on).getDay() + 6) % 7] += Math.round(t.amount * 100)
  }
  return WEEKDAYS.map((day, i) => ({
    day,
    total: totals[i] / 100,
    average: counts[i] ? totals[i] / 100 / counts[i] : 0,
    occurrences: counts[i],
  }))
}

/** Days in the range with no recorded spending. */
export function noSpendDays(txs: Transaction[], range: DateRange): { days: number; of: number } {
  const spent = new Set(txs.filter((t) => t.type === 'expense' && t.occurred_on >= range.from && t.occurred_on <= range.to).map((t) => t.occurred_on))
  const of = daysBetween(range)
  return { days: Math.max(of - spent.size, 0), of }
}

/** The biggest expenses, at most one per merchant so a repeating bill (rent) doesn't fill the list. */
export function largestExpenses(txs: Transaction[], n = 5): Transaction[] {
  const seen = new Set<string>()
  const out: Transaction[] = []
  for (const t of txs.filter((x) => x.type === 'expense').sort((a, b) => b.amount - a.amount)) {
    const key = t.merchant.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length === n) break
  }
  return out
}
