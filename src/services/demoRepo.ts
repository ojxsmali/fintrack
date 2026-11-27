/**
 * Browser-only implementation of FinanceRepo, used when no Supabase project is
 * configured. Mirrors the database's constraints (category kind must match
 * transaction type, one budget per category) so behaviour is identical.
 */
import type { Account, Budget, Category, Profile, Transaction } from '../types/finance'
import { AppError, type FinanceRepo } from './repository'

interface DemoState {
  profile: Profile
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  budgets: Budget[]
}

export const DEMO_STORAGE_KEY = 'fintrack.demo.v1'

const DEFAULT_CATEGORIES: [string, 'income' | 'expense'][] = [
  ['Housing', 'expense'], ['Food', 'expense'], ['Groceries', 'expense'], ['Transport', 'expense'],
  ['Shopping', 'expense'], ['Entertainment', 'expense'], ['Health', 'expense'], ['Education', 'expense'],
  ['Bills', 'expense'], ['Subscriptions', 'expense'], ['Travel', 'expense'], ['Other', 'expense'],
  ['Salary', 'income'], ['Freelance', 'income'], ['Interest', 'income'], ['Other income', 'income'],
]

const uuid = () => crypto.randomUUID()

export function freshDemoState(displayName: string, currency = 'INR'): DemoState {
  return {
    profile: { id: 'demo-user', display_name: displayName, currency, show_budget_warnings: true },
    accounts: [{ id: uuid(), name: 'Main account', kind: 'bank', starting_balance: 0 }],
    categories: DEFAULT_CATEGORIES.map(([name, kind]) => ({ id: uuid(), name, kind })),
    transactions: [],
    budgets: [],
  }
}

export interface DemoStorage {
  load(): DemoState | null
  save(s: DemoState): void
}

/**
 * One browser-only workspace per key, so the guest prototype and "your own" never mix.
 * The guest workspace passes `sessionStorage`: nothing outlives the tab.
 */
export function createLocalDemoStorage(key: string, area: 'local' | 'session' = 'local'): DemoStorage & { clear(): void } {
  const store = () => (area === 'session' ? sessionStorage : localStorage)
  return {
    load() {
      try {
        const raw = store().getItem(key)
        return raw ? (JSON.parse(raw) as DemoState) : null
      } catch {
        return null
      }
    },
    save(s) {
      try {
        store().setItem(key, JSON.stringify(s))
      } catch {
        throw new AppError('Your browser blocked saving data. Free up storage or leave private mode.', 'storage')
      }
    },
    clear() {
      try {
        store().removeItem(key)
      } catch {
        /* ignore */
      }
    },
  }
}

export const localDemoStorage = createLocalDemoStorage(DEMO_STORAGE_KEY)

export function createDemoRepo(storage: DemoStorage = localDemoStorage, latencyMs = 120): FinanceRepo {
  const read = (): DemoState => {
    const s = storage.load()
    if (!s) throw new AppError('Your session has expired. Please sign in again.', 'auth')
    return s
  }
  const wait = <T,>(v: T) => (latencyMs > 0 ? new Promise<T>((r) => setTimeout(() => r(v), latencyMs)) : Promise.resolve(v))
  // Always async: constraint violations surface as rejected promises, like the network repo.
  const mutate = async <T,>(fn: (s: DemoState) => T): Promise<T> => {
    const s = read()
    const out = fn(s)
    storage.save(s)
    return wait(structuredClone(out))
  }
  const assertCategory = (s: DemoState, categoryId: string, kind: 'income' | 'expense') => {
    const c = s.categories.find((x) => x.id === categoryId)
    if (!c || c.kind !== kind) throw new AppError('That category or account no longer exists. Refresh and try again.', 'fk')
  }
  const sortTx = (a: Transaction, b: Transaction) =>
    a.occurred_on === b.occurred_on ? (a.created_at < b.created_at ? 1 : -1) : a.occurred_on < b.occurred_on ? 1 : -1

  return {
    getProfile: () => wait(structuredClone(read().profile)),
    updateProfile: (patch) => mutate((s) => (s.profile = { ...s.profile, ...patch })),

    listAccounts: () => wait(structuredClone(read().accounts)),
    async listAccountBalances() {
      const s = read()
      return wait(
        s.accounts.map((a) => {
          const own = s.transactions.filter((t) => t.account_id === a.id)
          const cents = (type: string) => own.filter((t) => t.type === type).reduce((n, t) => n + Math.round(t.amount * 100), 0)
          const income = cents('income') / 100
          const expense = cents('expense') / 100
          return { ...a, income, expense, balance: (Math.round(a.starting_balance * 100) + cents('income') - cents('expense')) / 100 }
        }),
      )
    },
    createAccount: (input) =>
      mutate((s) => {
        const a = { ...input, id: uuid() }
        s.accounts.push(a)
        return a
      }),
    updateAccount: (id, patch) =>
      mutate((s) => {
        const a = s.accounts.find((x) => x.id === id)
        if (!a) throw new AppError('That account no longer exists.', 'fk')
        Object.assign(a, patch)
        return a
      }),

    listCategories: () => wait([...read().categories].sort((a, b) => a.name.localeCompare(b.name))),

    listTransactions: (range) =>
      wait(read().transactions.filter((t) => t.occurred_on >= range.from && t.occurred_on <= range.to).sort(sortTx)),

    async queryTransactions(q) {
      let rows = read().transactions
      if (q.type && q.type !== 'all') rows = rows.filter((t) => t.type === q.type)
      if (q.categoryId && q.categoryId !== 'all') rows = rows.filter((t) => t.category_id === q.categoryId)
      if (q.range) rows = rows.filter((t) => t.occurred_on >= q.range!.from && t.occurred_on <= q.range!.to)
      const s = q.search?.trim().toLowerCase()
      if (s) rows = rows.filter((t) => `${t.merchant} ${t.description} ${t.notes}`.toLowerCase().includes(s))
      const sort = q.sort ?? 'date_desc'
      rows = [...rows].sort((a, b) => {
        if (sort === 'date_asc') return -sortTx(a, b)
        if (sort === 'amount_desc') return b.amount - a.amount || sortTx(a, b)
        if (sort === 'amount_asc') return a.amount - b.amount || sortTx(a, b)
        return sortTx(a, b)
      })
      const start = (q.page - 1) * q.pageSize
      return wait({ rows: rows.slice(start, start + q.pageSize), total: rows.length })
    },
    countTransactions: () => wait(read().transactions.length),
    createTransaction: (input) =>
      mutate((s) => {
        assertCategory(s, input.category_id, input.type)
        const t: Transaction = { ...input, id: uuid(), is_sample: false, created_at: new Date().toISOString() }
        s.transactions.push(t)
        return t
      }),
    updateTransaction: (id, input) =>
      mutate((s) => {
        assertCategory(s, input.category_id, input.type)
        const t = s.transactions.find((x) => x.id === id)
        if (!t) throw new AppError('That transaction no longer exists.', 'missing')
        Object.assign(t, input)
        return t
      }),
    deleteTransaction: (id) =>
      mutate((s) => {
        s.transactions = s.transactions.filter((t) => t.id !== id)
      }),

    listBudgets: () => wait(structuredClone(read().budgets)),
    createBudget: (input) =>
      mutate((s) => {
        assertCategory(s, input.category_id, 'expense')
        if (s.budgets.some((b) => b.category_id === input.category_id)) throw new AppError('That category already has a budget.', 'duplicate')
        const b: Budget = { ...input, id: uuid(), is_sample: false }
        s.budgets.push(b)
        return b
      }),
    updateBudget: (id, input) =>
      mutate((s) => {
        assertCategory(s, input.category_id, 'expense')
        if (s.budgets.some((b) => b.category_id === input.category_id && b.id !== id)) throw new AppError('That category already has a budget.', 'duplicate')
        const b = s.budgets.find((x) => x.id === id)
        if (!b) throw new AppError('That budget no longer exists.', 'missing')
        Object.assign(b, input)
        return b
      }),
    deleteBudget: (id) =>
      mutate((s) => {
        s.budgets = s.budgets.filter((b) => b.id !== id)
      }),

    insertSampleData: (txs, budgets) =>
      mutate((s) => {
        const now = Date.now()
        txs.forEach((t, i) => s.transactions.push({ ...t, id: uuid(), created_at: new Date(now - i).toISOString() }))
        for (const b of budgets) {
          if (!s.budgets.some((x) => x.category_id === b.category_id)) s.budgets.push({ ...b, id: uuid(), is_sample: true })
        }
      }),
    removeSampleData: () =>
      mutate((s) => {
        s.transactions = s.transactions.filter((t) => !t.is_sample)
        s.budgets = s.budgets.filter((b) => !b.is_sample)
      }),
    hasSampleData: () => wait(read().transactions.some((t) => t.is_sample)),
    deleteAllTransactions: () =>
      mutate((s) => {
        s.transactions = []
      }),
    exportTransactions: () => wait([...read().transactions].sort(sortTx)),
  }
}
