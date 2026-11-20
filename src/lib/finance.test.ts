import { describe, expect, it } from 'vitest'
import {
  averageDailySpend,
  budgetState,
  budgetStatuses,
  cumulativePace,
  monthlySeries,
  overallBudgetUsage,
  percentChange,
  savingsRate,
  spendThroughDay,
  spendingByCategory,
  topMerchants,
  totalBalance,
  totals,
} from './finance'
import { budget, cats, tx } from '../test/factories'

describe('totals', () => {
  it('sums income and expenses separately and computes net', () => {
    const t = totals([
      tx({ type: 'income', amount: 42000, occurred_on: '2026-11-01' }),
      tx({ amount: 649, occurred_on: '2026-11-05' }),
      tx({ amount: 420.5, occurred_on: '2026-11-06' }),
    ])
    expect(t).toEqual({ income: 42000, expense: 1069.5, net: 40930.5 })
  })

  it('avoids floating-point drift', () => {
    const t = totals([tx({ amount: 0.1, occurred_on: '2026-11-01' }), tx({ amount: 0.2, occurred_on: '2026-11-01' })])
    expect(t.expense).toBe(0.3)
  })

  it('returns zeros for an empty dataset', () => {
    expect(totals([])).toEqual({ income: 0, expense: 0, net: 0 })
  })
})

describe('savingsRate', () => {
  it('is (income − expense) / income × 100', () => {
    expect(savingsRate(42000, 23650)).toBeCloseTo(43.69, 2)
  })
  it('is null with zero income (never NaN/Infinity)', () => {
    expect(savingsRate(0, 500)).toBeNull()
    expect(savingsRate(0, 0)).toBeNull()
  })
  it('can be negative when spending exceeds income', () => {
    expect(savingsRate(1000, 1500)).toBe(-50)
  })
})

describe('percentChange', () => {
  it('computes month-over-month change', () => {
    expect(percentChange(118, 100)).toBeCloseTo(18)
    expect(percentChange(92, 100)).toBeCloseTo(-8)
  })
  it('is null when there is no previous baseline', () => {
    expect(percentChange(500, 0)).toBeNull()
  })
})

describe('totalBalance', () => {
  it('adds account balances and supports negatives', () => {
    expect(
      totalBalance([
        { id: 'a', name: 'Bank', kind: 'bank', starting_balance: 10000, income: 0, expense: 0, balance: 10000 },
        { id: 'b', name: 'Card', kind: 'card', starting_balance: -2500, income: 0, expense: 1000, balance: -3500 },
      ]),
    ).toBe(6500)
  })
})

describe('budgets', () => {
  it('classifies healthy, approaching (≥80%) and exceeded (>100%)', () => {
    expect(budgetState(50)).toBe('healthy')
    expect(budgetState(80)).toBe('approaching')
    expect(budgetState(100)).toBe('approaching')
    expect(budgetState(100.01)).toBe('exceeded')
  })

  it('computes spent, remaining and percent from expenses in the category only', () => {
    const month = [
      tx({ amount: 3000, occurred_on: '2026-11-02', category_id: 'food' }),
      tx({ amount: 200, occurred_on: '2026-11-03', category_id: 'transport' }),
      tx({ type: 'income', amount: 5000, occurred_on: '2026-11-03', category_id: 'salary' }),
    ]
    const [food, transport] = budgetStatuses([budget('food', 2500), budget('transport', 4000)], month, cats)
    expect(food).toMatchObject({ categoryName: 'Food', spent: 3000, remaining: -500, state: 'exceeded' })
    expect(food.percent).toBeCloseTo(120)
    expect(transport).toMatchObject({ spent: 200, remaining: 3800, state: 'healthy' })
  })

  it('overall usage is null without budgets', () => {
    expect(overallBudgetUsage([])).toBeNull()
  })
})

describe('spendingByCategory', () => {
  it('groups, sorts by amount and computes shares', () => {
    const res = spendingByCategory(
      [
        tx({ amount: 300, occurred_on: '2026-11-01', category_id: 'food' }),
        tx({ amount: 700, occurred_on: '2026-11-01', category_id: 'rent' }),
        tx({ type: 'income', amount: 9999, occurred_on: '2026-11-01', category_id: 'salary' }),
      ],
      cats,
    )
    expect(res.map((r) => [r.name, r.amount, Math.round(r.share)])).toEqual([
      ['Housing', 700, 70],
      ['Food', 300, 30],
    ])
  })
  it('is empty for no data', () => {
    expect(spendingByCategory([], cats)).toEqual([])
  })
})

describe('series', () => {
  it('monthlySeries includes empty months with null savings rate', () => {
    const s = monthlySeries([tx({ type: 'income', amount: 100, occurred_on: '2026-09-10' })], { from: '2026-09-01', to: '2026-11-30' })
    expect(s.map((m) => m.key)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(s[1]).toMatchObject({ income: 0, expense: 0, savingsRate: null })
  })

  it('cumulativePace stops the current month at today', () => {
    const pace = cumulativePace(
      [tx({ amount: 100, occurred_on: '2026-11-01' }), tx({ amount: 50, occurred_on: '2026-11-03' })],
      [tx({ amount: 80, occurred_on: '2026-10-02' })],
      30,
      31,
      3,
    )
    expect(pace).toHaveLength(31)
    expect(pace[0]).toEqual({ day: 1, current: 100, previous: 0 })
    expect(pace[2]).toEqual({ day: 3, current: 150, previous: 80 })
    expect(pace[3].current).toBeNull()
    expect(pace[30]).toEqual({ day: 31, current: null, previous: 80 })
  })

  it('spendThroughDay compares like-for-like days', () => {
    const txs = [tx({ amount: 10, occurred_on: '2026-11-05' }), tx({ amount: 20, occurred_on: '2026-11-20' })]
    expect(spendThroughDay(txs, 10)).toBe(10)
  })

  it('averageDailySpend divides by inclusive day count', () => {
    expect(averageDailySpend(3000, { from: '2026-11-01', to: '2026-11-30' })).toBe(100)
  })

  it('topMerchants merges case variations', () => {
    const top = topMerchants([
      tx({ amount: 100, occurred_on: '2026-11-01', merchant: 'Swiggy' }),
      tx({ amount: 50, occurred_on: '2026-11-02', merchant: 'swiggy ' }),
      tx({ amount: 120, occurred_on: '2026-11-02', merchant: 'Uber' }),
    ])
    expect(top[0]).toMatchObject({ merchant: 'Swiggy', amount: 150, count: 2 })
  })
})

describe('analytics extras', () => {
  it('balanceSeries walks back from today’s balance', async () => {
    const { balanceSeries } = await import('./finance')
    const txs = [
      tx({ type: 'income', amount: 1000, occurred_on: '2026-10-05' }),
      tx({ amount: 300, occurred_on: '2026-11-10' }),
    ]
    // today: 0 start + 1000 − 300 = 700
    expect(balanceSeries(700, txs, ['2026-09', '2026-10', '2026-11'])).toEqual([
      { key: '2026-09', balance: 0 },
      { key: '2026-10', balance: 1000 },
      { key: '2026-11', balance: 700 },
    ])
  })

  it('spendingByWeekday averages over weekday occurrences, Monday first', async () => {
    const { spendingByWeekday } = await import('./finance')
    // 2026-11-02 is a Monday; range covers two full weeks.
    const res = spendingByWeekday(
      [tx({ amount: 100, occurred_on: '2026-11-02' }), tx({ amount: 300, occurred_on: '2026-11-09' }), tx({ type: 'income', amount: 999, occurred_on: '2026-11-03' })],
      { from: '2026-11-02', to: '2026-11-15' },
    )
    expect(res[0]).toEqual({ day: 'Mon', total: 400, average: 200, occurrences: 2 })
    expect(res[1].total).toBe(0)
    expect(res.map((r) => r.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('noSpendDays counts days without expenses', async () => {
    const { noSpendDays } = await import('./finance')
    expect(noSpendDays([tx({ amount: 5, occurred_on: '2026-11-02' }), tx({ amount: 5, occurred_on: '2026-11-02' })], { from: '2026-11-01', to: '2026-11-07' })).toEqual({ days: 6, of: 7 })
  })
})

describe('largestExpenses', () => {
  it('keeps one per merchant', async () => {
    const { largestExpenses } = await import('./finance')
    const res = largestExpenses([
      tx({ amount: 26000, occurred_on: '2026-10-03', merchant: 'Rent' }),
      tx({ amount: 26000, occurred_on: '2026-11-03', merchant: 'Rent' }),
      tx({ amount: 8400, occurred_on: '2026-11-04', merchant: 'IndiGo' }),
      tx({ type: 'income', amount: 90000, occurred_on: '2026-11-01', merchant: 'Salary' }),
    ])
    expect(res.map((t) => t.merchant)).toEqual(['Rent', 'IndiGo'])
  })
})
