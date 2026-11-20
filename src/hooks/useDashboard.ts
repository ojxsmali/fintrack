import { useMemo } from 'react'
import { addMonths, daysInMonth, endOfMonth, fmt, monthRange, toISODate } from '../lib/dates'
import {
  budgetStatuses,
  cumulativePace,
  filterRange,
  monthlySeries,
  overallBudgetUsage,
  percentChange,
  savingsRate,
  spendThroughDay,
  spendingByCategory,
  totalBalance,
  totals,
} from '../lib/finance'
import { generateInsights } from '../lib/insights'
import { useBalances, useBudgets, useCategories, useCurrency, useProfile, useTransactionsInRange } from './useFinance'

/**
 * Everything the overview needs, derived from one 4-month transaction window
 * (this month, last month, and two before for the savings comparison).
 */
export function useDashboard(now = new Date()) {
  const currency = useCurrency()
  const profile = useProfile()
  const balances = useBalances()
  const categories = useCategories()
  const budgets = useBudgets()
  const txWindow = useMemo(() => ({ from: toISODate(addMonths(now, -3)), to: toISODate(endOfMonth(now)) }), [now.getFullYear(), now.getMonth()]) // eslint-disable-line react-hooks/exhaustive-deps
  const txs = useTransactionsInRange(txWindow)

  const isLoading = profile.isLoading || balances.isLoading || categories.isLoading || budgets.isLoading || txs.isLoading
  const error = profile.error || balances.error || categories.error || budgets.error || txs.error

  const derived = useMemo(() => {
    if (!txs.data || !categories.data || !budgets.data || !balances.data) return null
    const cats = categories.data
    const thisMonth = monthRange(now)
    const prevDate = addMonths(now, -1)
    const lastMonth = monthRange(prevDate)
    const cur = filterRange(txs.data, thisMonth)
    const prev = filterRange(txs.data, lastMonth)
    const t = totals(cur)
    const day = now.getDate()

    const spentToDate = spendThroughDay(cur, day)
    const prevToDate = spendThroughDay(prev, day)
    const statuses = budgetStatuses(budgets.data, cur, cats)

    const past = monthlySeries(txs.data, { from: toISODate(addMonths(now, -3)), to: lastMonth.to })

    return {
      balance: totalBalance(balances.data),
      accounts: balances.data,
      month: t,
      savingsRate: savingsRate(t.income, t.expense),
      budgetUsage: overallBudgetUsage(statuses),
      pace: percentChange(spentToDate, prevToDate),
      spentToDate,
      prevToDate,
      byCategory: spendingByCategory(cur, cats),
      budgets: statuses,
      paceSeries: cumulativePace(cur, prev, daysInMonth(now), daysInMonth(prevDate), day),
      recent: [...txs.data].slice(0, 6),
      monthName: fmt.month(now),
      prevMonthName: fmt.month(prevDate),
      hasAnyData: txs.data.length > 0,
      insights: generateInsights({
        now,
        currency,
        categories: cats,
        currentMonth: cur,
        previousMonth: prev,
        pastMonths: past,
        budgets: statuses,
        showBudgetWarnings: profile.data?.show_budget_warnings ?? true,
      }),
    }
  }, [txs.data, categories.data, budgets.data, balances.data, profile.data, currency]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isLoading,
    error,
    refetch: () => Promise.all([txs.refetch(), balances.refetch(), budgets.refetch(), categories.refetch(), profile.refetch()]),
    profile: profile.data,
    categories: categories.data ?? [],
    currency,
    data: derived,
  }
}
