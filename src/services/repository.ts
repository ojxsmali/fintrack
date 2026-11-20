import type {
  Account,
  AccountBalance,
  Budget,
  BudgetInput,
  Category,
  DateRange,
  Page,
  Profile,
  Transaction,
  TransactionInput,
  TransactionQuery,
} from '../types/finance'

/**
 * The only boundary between UI and storage. Components never talk to Supabase
 * directly — they call hooks, which call a FinanceRepo. The user is always
 * derived server-side from the session (auth.uid()), never passed in by the UI.
 */
export interface FinanceRepo {
  getProfile(): Promise<Profile>
  updateProfile(patch: Partial<Omit<Profile, 'id'>>): Promise<Profile>

  listAccounts(): Promise<Account[]>
  listAccountBalances(): Promise<AccountBalance[]>
  createAccount(input: Omit<Account, 'id'>): Promise<Account>
  updateAccount(id: string, patch: Partial<Omit<Account, 'id'>>): Promise<Account>

  listCategories(): Promise<Category[]>

  /** All transactions in a date range — for aggregation. */
  listTransactions(range: DateRange): Promise<Transaction[]>
  /** Filtered, sorted, paginated — for the Transactions page. */
  queryTransactions(q: TransactionQuery): Promise<Page<Transaction>>
  countTransactions(): Promise<number>
  createTransaction(input: TransactionInput): Promise<Transaction>
  updateTransaction(id: string, input: TransactionInput): Promise<Transaction>
  deleteTransaction(id: string): Promise<void>

  listBudgets(): Promise<Budget[]>
  createBudget(input: BudgetInput): Promise<Budget>
  updateBudget(id: string, input: BudgetInput): Promise<Budget>
  deleteBudget(id: string): Promise<void>

  insertSampleData(txs: (TransactionInput & { is_sample: true })[], budgets: BudgetInput[]): Promise<void>
  removeSampleData(): Promise<void>
  hasSampleData(): Promise<boolean>
  deleteAllTransactions(): Promise<void>
  exportTransactions(): Promise<Transaction[]>
}

/** A safe, human-readable error. Raw database messages never reach the UI. */
export class AppError extends Error {
  readonly code: string
  constructor(message: string, code = 'unknown') {
    super(message)
    this.code = code
  }
}

export function friendlyError(err: unknown): string {
  if (err instanceof AppError) return err.message
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'You appear to be offline. Check your connection and try again.'
  const msg = err instanceof Error ? err.message : ''
  if (/fetch|network|Failed to fetch/i.test(msg)) return 'We couldn’t reach FinTrack’s servers. Check your connection and try again.'
  return 'Something went wrong on our side. Please try again.'
}
