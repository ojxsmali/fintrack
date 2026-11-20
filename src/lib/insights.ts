/**
 * Deterministic insights. Each rule is a plain calculation over the user's own
 * transactions; nothing here is a model or a guess. Rules only fire when the
 * data is strong enough to say something true (minimum amounts, baselines).
 */
import type { Category, Transaction } from '../types/finance'
import { formatCurrency, formatPercent } from './format'
import {
  type BudgetStatus,
  type MonthPoint,
  largestExpense,
  percentChange,
  spendThroughDay,
  spendingByCategory,
  totals,
} from './finance'
import { fmt, parseISODate } from './dates'

export type InsightTone = 'positive' | 'neutral' | 'attention'

export interface Insight {
  id: string
  tone: InsightTone
  text: string
  /** How the number was derived — shown on request, keeps the product honest. */
  basis: string
  /** Higher sorts first. */
  priority: number
}

export interface InsightInput {
  now: Date
  currency: string
  categories: Category[]
  currentMonth: Transaction[]
  previousMonth: Transaction[]
  /** Completed months before the current one, oldest first (up to 3). */
  pastMonths: MonthPoint[]
  budgets: BudgetStatus[]
  showBudgetWarnings: boolean
}

/** Ignore category moves smaller than this — noise, not signal. */
const MIN_CATEGORY_BASE = 500
const MIN_CATEGORY_CHANGE_PCT = 15

export function generateInsights(input: InsightInput): Insight[] {
  const { now, currency, categories, currentMonth, previousMonth, pastMonths, budgets } = input
  const money = (n: number) => formatCurrency(n, currency)
  const out: Insight[] = []
  const day = now.getDate()
  const prevMonthName = fmt.month(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  // 1 · Overall spending pace vs the same point last month.
  const spentNow = spendThroughDay(currentMonth, day)
  const spentPrev = spendThroughDay(previousMonth, day)
  const pace = percentChange(spentNow, spentPrev)
  if (pace !== null && Math.abs(pace) >= 5 && spentNow > 0) {
    const less = pace < 0
    out.push({
      id: 'pace',
      tone: less ? 'positive' : 'attention',
      text: `You've spent ${formatPercent(Math.abs(pace))} ${less ? 'less' : 'more'} than at this point in ${prevMonthName}.`,
      basis: `${money(spentNow)} spent from the 1st to the ${ordinal(day)} this month vs ${money(spentPrev)} over the same days in ${prevMonthName}.`,
      priority: 50,
    })
  }

  // 2 · Biggest category move, like-for-like days.
  const curCats = spendingByCategory(currentMonth.filter((t) => Number(t.occurred_on.slice(8, 10)) <= day), categories)
  const prevCats = new Map(
    spendingByCategory(previousMonth.filter((t) => Number(t.occurred_on.slice(8, 10)) <= day), categories).map((c) => [c.categoryId, c.amount]),
  )
  const moves = curCats
    .map((c) => ({ c, prev: prevCats.get(c.categoryId) ?? 0 }))
    .filter(({ prev }) => prev >= MIN_CATEGORY_BASE)
    .map(({ c, prev }) => ({ c, prev, change: percentChange(c.amount, prev) ?? 0 }))
    .filter((m) => Math.abs(m.change) >= MIN_CATEGORY_CHANGE_PCT)
    .sort((a, b) => Math.abs(b.change * b.prev) - Math.abs(a.change * a.prev))
  const move = moves[0]
  if (move) {
    const up = move.change > 0
    out.push({
      id: `cat-${move.c.categoryId}`,
      tone: up ? 'attention' : 'positive',
      text: `${move.c.name} spending is ${up ? 'up' : 'down'} ${formatPercent(Math.abs(move.change))} on ${prevMonthName}.`,
      basis: `${money(move.c.amount)} so far this month vs ${money(move.prev)} by the same day last month.`,
      priority: 40,
    })
  }

  // 3 · Budgets.
  if (input.showBudgetWarnings) {
    const exceeded = budgets.filter((b) => b.state === 'exceeded')
    const approaching = budgets.filter((b) => b.state === 'approaching')
    for (const b of exceeded.slice(0, 2)) {
      out.push({
        id: `budget-over-${b.budget.id}`,
        tone: 'attention',
        text: `${b.categoryName} is ${money(-b.remaining)} over its ${money(b.limit)} budget.`,
        basis: `${money(b.spent)} spent in ${b.categoryName} this month against a ${money(b.limit)} monthly limit.`,
        priority: 70,
      })
    }
    if (approaching[0]) {
      const b = approaching[0]
      out.push({
        id: `budget-near-${b.budget.id}`,
        tone: 'neutral',
        text: `${b.categoryName} has ${money(b.remaining)} left in its budget for the rest of the month.`,
        basis: `${formatPercent(b.percent)} of the ${money(b.limit)} limit used.`,
        priority: 60,
      })
    }
    if (budgets.length > 0 && exceeded.length === 0 && approaching.length === 0) {
      out.push({
        id: 'budgets-ok',
        tone: 'positive',
        text: budgets.length === 1 ? `${budgets[0].categoryName} is within budget.` : `All ${budgets.length} budgets are on track.`,
        basis: `Every budgeted category is below ${80}% of its monthly limit.`,
        priority: 20,
      })
    }
  }

  // 4 · Subscriptions share.
  const monthTotals = totals(currentMonth)
  const subs = categories.find((c) => c.kind === 'expense' && c.name.toLowerCase() === 'subscriptions')
  if (subs && monthTotals.expense > 0) {
    const subSpend = curCats.find((c) => c.categoryId === subs.id)?.amount ?? 0
    const share = (subSpend / monthTotals.expense) * 100
    if (subSpend > 0 && share >= 3) {
      out.push({
        id: 'subscriptions',
        tone: 'neutral',
        text: `Subscriptions are ${formatPercent(share)} of your spending this month.`,
        basis: `${money(subSpend)} in Subscriptions out of ${money(monthTotals.expense)} total spending.`,
        priority: 15,
      })
    }
  }

  // 5 · Last completed month's savings vs the two before it.
  if (pastMonths.length >= 3) {
    const [a, b, last] = pastMonths.slice(-3)
    if (last.income > 0 && last.net > 0 && last.net > a.net && last.net > b.net) {
      out.push({
        id: 'savings-streak',
        tone: 'positive',
        text: `You saved more in ${fmt.month(parseISODate(`${last.key}-01`))} than in either of the two months before.`,
        basis: `Net saved: ${money(last.net)} vs ${money(b.net)} and ${money(a.net)}.`,
        priority: 30,
      })
    } else if (last.income > 0 && last.net < 0) {
      out.push({
        id: 'overspent-last',
        tone: 'attention',
        text: `${fmt.month(parseISODate(`${last.key}-01`))} ended with ${money(-last.net)} more spent than earned.`,
        basis: `Income ${money(last.income)} vs spending ${money(last.expense)}.`,
        priority: 45,
      })
    }
  }

  // 6 · Largest single expense this month, when it's a meaningful share.
  const big = largestExpense(currentMonth)
  if (big && monthTotals.expense > 0 && big.amount / monthTotals.expense >= 0.25 && currentMonth.length >= 4) {
    out.push({
      id: 'largest',
      tone: 'neutral',
      text: `${big.merchant} on ${fmt.day(big.occurred_on)} is your largest expense this month at ${money(big.amount)}.`,
      basis: `${formatPercent((big.amount / monthTotals.expense) * 100)} of this month's spending.`,
      priority: 10,
    })
  }

  return out.sort((a, b) => b.priority - a.priority)
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
