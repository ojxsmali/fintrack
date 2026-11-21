import { describe, expect, it } from 'vitest'
import { buildHeroPreview } from './heroPreview'

describe('buildHeroPreview', () => {
  const now = new Date(2026, 10, 21) // 21 Nov 2026
  const p = buildHeroPreview(now)

  it('names this month and the previous one', () => {
    expect(p.monthName).toBe('November')
    expect(p.prevMonthName).toBe('October')
  })

  it('keeps income − spending = net and derives the savings rate from them', () => {
    expect(p.income).toBeGreaterThan(0)
    expect(p.net).toBeCloseTo(p.income - p.expense, 2)
    expect(p.savingsRate).toBeCloseTo(((p.income - p.expense) / p.income) * 100, 6)
  })

  it('stops the current-month pace line at today and ends it at the month’s total spend', () => {
    const current = p.pace.filter((d) => d.current !== null)
    expect(current.at(-1)?.day).toBe(21)
    expect(current.at(-1)?.current).toBeCloseTo(p.expense, 2)
    expect(p.pace.length).toBe(31) // October has 31 days, November 30
  })

  it('lists the top four categories by share, largest first', () => {
    expect(p.topCategories).toHaveLength(4)
    const shares = p.topCategories.map((c) => c.share)
    expect([...shares].sort((a, b) => b - a)).toEqual(shares)
    expect(shares.every((s) => s > 0 && s <= 100)).toBe(true)
  })

  it('is deterministic for the same date', () => {
    expect(buildHeroPreview(now)).toEqual(p)
  })
})
