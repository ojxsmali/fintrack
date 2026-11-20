import { describe, expect, it } from 'vitest'
import { generateInsights, ordinal, type InsightInput } from './insights'
import { budgetStatuses } from './finance'
import { budget, cats, tx } from '../test/factories'

const base = (over: Partial<InsightInput> = {}): InsightInput => ({
  now: new Date(2026, 10, 20),
  currency: 'INR',
  categories: cats,
  currentMonth: [],
  previousMonth: [],
  pastMonths: [],
  budgets: [],
  showBudgetWarnings: true,
  ...over,
})

describe('generateInsights', () => {
  it('says nothing when there is no data (no fabricated insights)', () => {
    expect(generateInsights(base())).toEqual([])
  })

  it('reports spending pace against the same days last month', () => {
    const ins = generateInsights(
      base({
        currentMonth: [tx({ amount: 9200, occurred_on: '2026-11-10', category_id: 'rent' })],
        previousMonth: [tx({ amount: 10000, occurred_on: '2026-10-10', category_id: 'rent' }), tx({ amount: 50000, occurred_on: '2026-10-25', category_id: 'rent' })],
      }),
    )
    const pace = ins.find((i) => i.id === 'pace')!
    expect(pace.text).toBe("You've spent 8% less than at this point in October.")
    expect(pace.tone).toBe('positive')
  })

  it('flags a category increase only above the noise threshold', () => {
    const ins = generateInsights(
      base({
        currentMonth: [tx({ amount: 1180, occurred_on: '2026-11-05', category_id: 'food' })],
        previousMonth: [tx({ amount: 1000, occurred_on: '2026-10-05', category_id: 'food' })],
      }),
    )
    expect(ins.find((i) => i.id === 'cat-food')?.text).toBe('Food spending is up 18% on October.')

    const tiny = generateInsights(
      base({
        currentMonth: [tx({ amount: 300, occurred_on: '2026-11-05', category_id: 'food' })],
        previousMonth: [tx({ amount: 100, occurred_on: '2026-10-05', category_id: 'food' })],
      }),
    )
    expect(tiny.find((i) => i.id === 'cat-food')).toBeUndefined()
  })

  it('reports exceeded budgets first, and respects the warnings preference', () => {
    const cur = [tx({ amount: 3200, occurred_on: '2026-11-05', category_id: 'food' })]
    const statuses = budgetStatuses([budget('food', 3000)], cur, cats)
    const on = generateInsights(base({ currentMonth: cur, budgets: statuses }))
    expect(on[0].text).toContain('Food is ₹200 over its ₹3,000 budget')
    const off = generateInsights(base({ currentMonth: cur, budgets: statuses, showBudgetWarnings: false }))
    expect(off.some((i) => i.id.startsWith('budget'))).toBe(false)
  })

  it('computes the subscriptions share of spending', () => {
    const ins = generateInsights(
      base({
        currentMonth: [tx({ amount: 700, occurred_on: '2026-11-02', category_id: 'subs' }), tx({ amount: 9300, occurred_on: '2026-11-03', category_id: 'rent' })],
      }),
    )
    expect(ins.find((i) => i.id === 'subscriptions')?.text).toBe('Subscriptions are 7% of your spending this month.')
  })

  it('compares last month’s savings with the two months before', () => {
    const ins = generateInsights(
      base({
        pastMonths: [
          { key: '2026-08', income: 50000, expense: 40000, net: 10000, savingsRate: 20 },
          { key: '2026-09', income: 50000, expense: 38000, net: 12000, savingsRate: 24 },
          { key: '2026-10', income: 50000, expense: 30000, net: 20000, savingsRate: 40 },
        ],
      }),
    )
    expect(ins.find((i) => i.id === 'savings-streak')?.text).toBe('You saved more in October than in either of the two months before.')
  })

  it('formats ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd'])
  })
})
