import type { Budget, Category, Transaction } from '../types/finance'

export const cats: Category[] = [
  { id: 'food', name: 'Food', kind: 'expense' },
  { id: 'rent', name: 'Housing', kind: 'expense' },
  { id: 'subs', name: 'Subscriptions', kind: 'expense' },
  { id: 'transport', name: 'Transport', kind: 'expense' },
  { id: 'salary', name: 'Salary', kind: 'income' },
]

let n = 0
export function tx(p: Partial<Transaction> & Pick<Transaction, 'amount' | 'occurred_on'>): Transaction {
  n += 1
  return {
    id: `t${n}`,
    account_id: 'acc',
    category_id: p.type === 'income' ? 'salary' : 'food',
    type: 'expense',
    merchant: 'Merchant',
    description: '',
    notes: '',
    is_sample: false,
    created_at: new Date(2026, 0, 1, 0, 0, n).toISOString(),
    ...p,
  }
}

export function budget(category_id: string, monthly_limit: number): Budget {
  return { id: `b-${category_id}`, category_id, monthly_limit, is_sample: false }
}
