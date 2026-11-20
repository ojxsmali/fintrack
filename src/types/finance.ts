export type TxType = 'income' | 'expense'
export type AccountKind = 'bank' | 'card' | 'cash' | 'wallet'

/** ISO calendar date, YYYY-MM-DD, interpreted in the user's local time zone. */
export type ISODate = string

export interface Profile {
  id: string
  display_name: string
  currency: string
  show_budget_warnings: boolean
}

export interface Account {
  id: string
  name: string
  kind: AccountKind
  starting_balance: number
}

export interface AccountBalance extends Account {
  income: number
  expense: number
  balance: number
}

export interface Category {
  id: string
  name: string
  kind: TxType
}

export interface Transaction {
  id: string
  account_id: string
  category_id: string
  type: TxType
  amount: number
  merchant: string
  description: string
  notes: string
  occurred_on: ISODate
  is_sample: boolean
  created_at: string
}

export type TransactionInput = Pick<
  Transaction,
  'account_id' | 'category_id' | 'type' | 'amount' | 'merchant' | 'description' | 'notes' | 'occurred_on'
>

export interface Budget {
  id: string
  category_id: string
  monthly_limit: number
  is_sample: boolean
}

export interface BudgetInput {
  category_id: string
  monthly_limit: number
}

export interface DateRange {
  from: ISODate
  to: ISODate
}

export type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

export interface TransactionQuery {
  search?: string
  type?: TxType | 'all'
  categoryId?: string | 'all'
  range?: DateRange
  sort?: SortKey
  page: number
  pageSize: number
}

export interface Page<T> {
  rows: T[]
  total: number
}
