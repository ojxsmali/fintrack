/**
 * Figures for the welcome page's live preview card. They are computed from the
 * same deterministic sample set the prototype loads, so every number on the
 * landing page matches what a visitor sees after clicking "Open the prototype".
 */
import type { Category, Transaction } from '../types/finance'
import { buildSampleData } from './sampleData'
import { cumulativePace, savingsRate, spendingByCategory, totals } from './finance'
import { addMonths, daysInMonth, toISODate } from './dates'

const NAMES: [string, 'income' | 'expense'][] = [
  ['Housing', 'expense'], ['Food', 'expense'], ['Groceries', 'expense'], ['Transport', 'expense'],
  ['Shopping', 'expense'], ['Entertainment', 'expense'], ['Health', 'expense'], ['Education', 'expense'],
  ['Bills', 'expense'], ['Subscriptions', 'expense'], ['Travel', 'expense'], ['Other', 'expense'],
  ['Salary', 'income'], ['Freelance', 'income'], ['Interest', 'income'], ['Other income', 'income'],
]

export interface HeroPreview {
  monthName: string
  prevMonthName: string
  income: number
  expense: number
  net: number
  savingsRate: number | null
  /** Cumulative spend by day for this month (to today) and last month. */
  pace: { day: number; current: number | null; previous: number | null }[]
  topCategories: { name: string; amount: number; share: number }[]
  transactionCount: number
}

export function buildHeroPreview(now = new Date()): HeroPreview {
  const categories: Category[] = NAMES.map(([name, kind]) => ({ id: `${kind}:${name}`, name, kind }))
  const plan = buildSampleData(categories, 'preview', now)
  const txs: Transaction[] = plan.transactions.map((t, i) => ({ ...t, id: String(i), created_at: '' }))

  const thisKey = toISODate(now).slice(0, 7)
  const prev = addMonths(now, -1)
  const prevKey = toISODate(prev).slice(0, 7)
  const month = txs.filter((t) => t.occurred_on.startsWith(thisKey))
  const prevMonth = txs.filter((t) => t.occurred_on.startsWith(prevKey))
  const t = totals(month)

  const fmt = (d: Date) => d.toLocaleString('en', { month: 'long' })
  return {
    monthName: fmt(now),
    prevMonthName: fmt(prev),
    income: t.income,
    expense: t.expense,
    net: t.net,
    savingsRate: savingsRate(t.income, t.expense),
    pace: cumulativePace(month, prevMonth, daysInMonth(now), daysInMonth(prev), now.getDate()),
    topCategories: spendingByCategory(month, categories)
      .slice(0, 4)
      .map((c) => ({ name: c.name, amount: c.amount, share: c.share })),
    transactionCount: txs.length,
  }
}
