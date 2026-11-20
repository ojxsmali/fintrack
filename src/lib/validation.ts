import type { BudgetInput, Category, TransactionInput, TxType } from '../types/finance'
import { isValidISODate } from './dates'

export type FieldErrors<K extends string> = Partial<Record<K, string>>

export interface TransactionDraft {
  type: TxType
  amount: string
  category_id: string
  account_id: string
  merchant: string
  occurred_on: string
  description: string
  notes: string
}

const MAX_AMOUNT = 999_999_999

/** Accepts "1,200.50", "1200", "₹1,200". Returns null for anything else. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s₹$€£]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Number(cleaned)
}

export function validateTransaction(
  d: TransactionDraft,
  ctx: { categories: Category[]; accountIds: string[] },
): { ok: true; value: TransactionInput } | { ok: false; errors: FieldErrors<keyof TransactionDraft> } {
  const errors: FieldErrors<keyof TransactionDraft> = {}

  const trimmed = d.amount.trim()
  const amount = parseAmount(trimmed)
  if (!trimmed) errors.amount = 'Enter an amount.'
  else if (trimmed.startsWith('-')) errors.amount = 'Amount can’t be negative — choose Expense instead.'
  else if (amount === null) errors.amount = 'Use numbers only, with up to two decimals.'
  else if (amount <= 0) errors.amount = 'Amount must be more than zero.'
  else if (amount > MAX_AMOUNT) errors.amount = 'That amount is too large.'

  const cat = ctx.categories.find((c) => c.id === d.category_id)
  if (!d.category_id) errors.category_id = 'Choose a category.'
  else if (!cat) errors.category_id = 'That category no longer exists.'
  else if (cat.kind !== d.type) errors.category_id = `Choose an ${d.type} category.`

  if (!d.account_id || !ctx.accountIds.includes(d.account_id)) errors.account_id = 'Choose an account.'

  const merchant = d.merchant.trim()
  if (!merchant) errors.merchant = d.type === 'income' ? 'Who paid you?' : 'Where did you spend this?'
  else if (merchant.length > 80) errors.merchant = 'Keep this under 80 characters.'

  if (!d.occurred_on) errors.occurred_on = 'Choose a date.'
  else if (!isValidISODate(d.occurred_on)) errors.occurred_on = 'That date isn’t valid.'
  else if (d.occurred_on < '2000-01-01' || d.occurred_on > '2100-01-01') errors.occurred_on = 'Choose a date between 2000 and 2100.'

  if (d.description.length > 140) errors.description = 'Keep this under 140 characters.'
  if (d.notes.length > 1000) errors.notes = 'Keep notes under 1,000 characters.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      type: d.type,
      amount: amount!,
      category_id: d.category_id,
      account_id: d.account_id,
      merchant,
      occurred_on: d.occurred_on,
      description: d.description.trim(),
      notes: d.notes.trim(),
    },
  }
}

export function validateBudget(
  d: { category_id: string; monthly_limit: string },
  ctx: { categories: Category[] },
): { ok: true; value: BudgetInput } | { ok: false; errors: FieldErrors<'category_id' | 'monthly_limit'> } {
  const errors: FieldErrors<'category_id' | 'monthly_limit'> = {}
  const cat = ctx.categories.find((c) => c.id === d.category_id)
  if (!cat) errors.category_id = 'Choose a category.'
  else if (cat.kind !== 'expense') errors.category_id = 'Budgets apply to spending categories.'
  const limit = parseAmount(d.monthly_limit.trim())
  if (!d.monthly_limit.trim()) errors.monthly_limit = 'Set a monthly limit.'
  else if (limit === null || limit <= 0) errors.monthly_limit = 'Enter an amount above zero.'
  else if (limit > MAX_AMOUNT) errors.monthly_limit = 'That amount is too large.'
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, value: { category_id: d.category_id, monthly_limit: limit! } }
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Enter your email.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'That email doesn’t look right.'
  return null
}

export function validatePassword(pw: string, mode: 'signup' | 'login'): string | null {
  if (!pw) return 'Enter your password.'
  if (mode === 'signup' && pw.length < 8) return 'Use at least 8 characters.'
  return null
}
