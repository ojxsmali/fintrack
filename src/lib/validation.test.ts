import { describe, expect, it } from 'vitest'
import { parseAmount, validateBudget, validateEmail, validatePassword, validateTransaction, type TransactionDraft } from './validation'
import { cats } from '../test/factories'
import { allCurrencies, currencyDecimals, formatCurrency, formatPercent, formatTxAmount } from './format'
import { previousPeriod, resolvePeriod } from './periods'

const ctx = { categories: cats, accountIds: ['acc'] }
const draft = (p: Partial<TransactionDraft> = {}): TransactionDraft => ({
  type: 'expense',
  amount: '420',
  category_id: 'food',
  account_id: 'acc',
  merchant: 'Swiggy',
  occurred_on: '2026-11-14',
  description: '',
  notes: '',
  ...p,
})

describe('validateTransaction', () => {
  it('accepts a valid expense and trims text', () => {
    const r = validateTransaction(draft({ merchant: '  Swiggy  ', amount: '1,200.50' }), ctx)
    expect(r.ok && r.value).toMatchObject({ amount: 1200.5, merchant: 'Swiggy' })
  })

  it.each([
    ['', 'Enter an amount.'],
    ['-50', 'Amount can’t be negative — choose Expense instead.'],
    ['0', 'Amount must be more than zero.'],
    ['12.345', 'Use numbers only, with up to two decimals.'],
    ['abc', 'Use numbers only, with up to two decimals.'],
  ])('rejects amount %j', (amount, msg) => {
    const r = validateTransaction(draft({ amount }), ctx)
    expect(!r.ok && r.errors.amount).toBe(msg)
  })

  it('requires fields', () => {
    const r = validateTransaction(draft({ merchant: ' ', category_id: '', occurred_on: '' }), ctx)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['category_id', 'merchant', 'occurred_on'])
  })

  it('rejects categories that do not exist or do not match the type', () => {
    expect(validateTransaction(draft({ category_id: 'ghost' }), ctx).ok).toBe(false)
    const r = validateTransaction(draft({ type: 'income', category_id: 'food' }), ctx)
    expect(!r.ok && r.errors.category_id).toBe('Choose an income category.')
  })

  it('rejects impossible dates', () => {
    const r = validateTransaction(draft({ occurred_on: '2026-02-30' }), ctx)
    expect(!r.ok && r.errors.occurred_on).toBe('That date isn’t valid.')
  })
})

describe('other validators', () => {
  it('parseAmount', () => {
    expect(parseAmount('₹1,000')).toBe(1000)
    expect(parseAmount('1e5')).toBeNull()
  })
  it('validateBudget only allows expense categories and positive limits', () => {
    expect(validateBudget({ category_id: 'salary', monthly_limit: '100' }, { categories: cats }).ok).toBe(false)
    expect(validateBudget({ category_id: 'food', monthly_limit: '0' }, { categories: cats }).ok).toBe(false)
    expect(validateBudget({ category_id: 'food', monthly_limit: '8000' }, { categories: cats })).toEqual({ ok: true, value: { category_id: 'food', monthly_limit: 8000 } })
  })
  it('auth validators', () => {
    expect(validateEmail('a@b')).not.toBeNull()
    expect(validateEmail('ojas@example.com')).toBeNull()
    expect(validatePassword('short', 'signup')).toBe('Use at least 8 characters.')
    expect(validatePassword('short', 'login')).toBeNull()
  })
})

describe('formatting', () => {
  it('formats INR with Indian grouping and a true minus sign', () => {
    expect(formatCurrency(84250)).toBe('₹84,250')
    expect(formatCurrency(1234567.5)).toBe('₹12,34,567.50')
    expect(formatCurrency(-649)).toBe('−₹649')
    expect(formatTxAmount(42000, 'income', 'INR')).toBe('+₹42,000')
    expect(formatTxAmount(649, 'expense', 'INR')).toBe('−₹649')
  })
  it('never prints NaN/Infinity', () => {
    expect(formatCurrency(Number.NaN)).toBe('—')
    expect(formatPercent(null)).toBe('—')
    expect(formatPercent(Infinity)).toBe('—')
    expect(formatPercent(-8.2)).toBe('−8%')
  })
})

describe('periods', () => {
  const now = new Date(2026, 10, 20)
  it('resolves presets', () => {
    expect(resolvePeriod('this_month', now)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(resolvePeriod('last_month', now)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(resolvePeriod('last_3_months', now)).toEqual({ from: '2026-09-01', to: '2026-11-30' })
  })
  it('previousPeriod mirrors whole months and arbitrary ranges', () => {
    expect(previousPeriod({ from: '2026-09-01', to: '2026-11-30' })).toEqual({ from: '2026-06-01', to: '2026-08-31' })
    expect(previousPeriod({ from: '2026-11-10', to: '2026-11-19' })).toEqual({ from: '2026-10-31', to: '2026-11-09' })
  })
})

describe('currencies', () => {
  it('lists every real currency and skips non-money codes', () => {
    const codes = allCurrencies().map((c) => c.code)
    expect(codes.length).toBeGreaterThan(140)
    expect(codes).toEqual(expect.arrayContaining(['INR', 'USD', 'EUR', 'JPY', 'AED', 'KWD']))
    expect(codes).not.toContain('XDR')
    expect(codes).not.toContain('XAU')
  })
  it('formats each currency with its own symbol and minor units', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50')
    expect(formatCurrency(1234, 'JPY')).toBe('¥1,234')
    expect(formatCurrency(-20.5, 'EUR')).toBe('−€20.50')
    expect(formatCurrency(150000, 'INR')).toBe('₹1,50,000')
    expect(currencyDecimals('JPY')).toBe(0)
    expect(currencyDecimals('KWD')).toBe(3)
  })
})
