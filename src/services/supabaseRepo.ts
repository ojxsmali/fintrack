import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import type {
  Account,
  AccountBalance,
  Budget,
  Category,
  Page,
  Profile,
  Transaction,
  TransactionQuery,
} from '../types/finance'
import { AppError, type FinanceRepo } from './repository'

const TX_COLUMNS = 'id,account_id,category_id,type,amount,merchant,description,notes,occurred_on,is_sample,created_at'

function fail(error: PostgrestError | null): void {
  if (!error) return
  // Map database errors to messages a person can act on. Never surface error.message.
  if (error.code === '23503') throw new AppError('That category or account no longer exists. Refresh and try again.', 'fk')
  if (error.code === '23505') throw new AppError('That already exists.', 'duplicate')
  if (error.code === '23514') throw new AppError('Some values are out of range. Check the form and try again.', 'check')
  if (error.code === '42501' || error.code === 'PGRST301') throw new AppError('Your session has expired. Please sign in again.', 'auth')
  if (/fetch/i.test(error.message)) throw new AppError('We couldn’t reach FinTrack’s servers. Check your connection and try again.', 'network')
  console.error('[supabase]', error.code, error.message)
  throw new AppError('Something went wrong saving your data. Please try again.', 'db')
}

const num = (v: unknown) => Number(v)
const toTx = (r: Record<string, unknown> | null): Transaction => ({ ...(r as unknown as Transaction), amount: num(r!.amount) })
const toBudget = (r: Record<string, unknown> | null): Budget => ({ ...(r as unknown as Budget), monthly_limit: num(r!.monthly_limit) })
const toAccount = (r: Record<string, unknown> | null): Account => ({ ...(r as unknown as Account), starting_balance: num(r!.starting_balance) })

/** PostgREST `or` filter syntax treats , ( ) as operators — strip them from user input. */
function sanitizeSearch(q: string): string {
  return q.replace(/[,()%*\\:]/g, ' ').trim().slice(0, 60)
}

export function createSupabaseRepo(sb: SupabaseClient): FinanceRepo {
  async function uid(): Promise<string> {
    const { data } = await sb.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new AppError('Your session has expired. Please sign in again.', 'auth')
    return id
  }

  return {
    async getProfile() {
      const id = await uid()
      const { data, error } = await sb.from('profiles').select('id,display_name,currency,show_budget_warnings').eq('id', id).single()
      fail(error)
      return data as Profile
    },
    async updateProfile(patch) {
      const id = await uid()
      const { data, error } = await sb.from('profiles').update(patch).eq('id', id).select('id,display_name,currency,show_budget_warnings').single()
      fail(error)
      return data as Profile
    },

    async listAccounts() {
      const { data, error } = await sb.from('accounts').select('id,name,kind,starting_balance').order('created_at')
      fail(error)
      return (data ?? []).map(toAccount)
    },
    async listAccountBalances() {
      const { data, error } = await sb.from('account_balances').select('account_id,name,kind,starting_balance,income,expense,balance')
      fail(error)
      return (data ?? []).map(
        (r): AccountBalance => ({
          id: r.account_id,
          name: r.name,
          kind: r.kind,
          starting_balance: num(r.starting_balance),
          income: num(r.income),
          expense: num(r.expense),
          balance: num(r.balance),
        }),
      )
    },
    async createAccount(input) {
      const { data, error } = await sb.from('accounts').insert(input).select('id,name,kind,starting_balance').single()
      fail(error)
      return toAccount(data)
    },
    async updateAccount(id, patch) {
      const { data, error } = await sb.from('accounts').update(patch).eq('id', id).select('id,name,kind,starting_balance').single()
      fail(error)
      return toAccount(data)
    },

    async listCategories() {
      const { data, error } = await sb.from('categories').select('id,name,kind').order('name')
      fail(error)
      return (data ?? []) as Category[]
    },

    async listTransactions(range) {
      // Paged fetch: PostgREST caps responses (1000 rows by default).
      const all: Transaction[] = []
      const size = 1000
      for (let from = 0; ; from += size) {
        const { data, error } = await sb
          .from('transactions')
          .select(TX_COLUMNS)
          .gte('occurred_on', range.from)
          .lte('occurred_on', range.to)
          .order('occurred_on', { ascending: false })
          .order('created_at', { ascending: false })
          .range(from, from + size - 1)
        fail(error)
        all.push(...(data ?? []).map(toTx))
        if (!data || data.length < size) break
      }
      return all
    },

    async queryTransactions(q: TransactionQuery): Promise<Page<Transaction>> {
      let req = sb.from('transactions').select(TX_COLUMNS, { count: 'exact' })
      if (q.type && q.type !== 'all') req = req.eq('type', q.type)
      if (q.categoryId && q.categoryId !== 'all') req = req.eq('category_id', q.categoryId)
      if (q.range) req = req.gte('occurred_on', q.range.from).lte('occurred_on', q.range.to)
      const s = q.search ? sanitizeSearch(q.search) : ''
      if (s) req = req.or(`merchant.ilike.*${s}*,description.ilike.*${s}*,notes.ilike.*${s}*`)
      switch (q.sort ?? 'date_desc') {
        case 'date_asc':
          req = req.order('occurred_on', { ascending: true }).order('created_at', { ascending: true })
          break
        case 'amount_desc':
          req = req.order('amount', { ascending: false }).order('occurred_on', { ascending: false })
          break
        case 'amount_asc':
          req = req.order('amount', { ascending: true }).order('occurred_on', { ascending: false })
          break
        default:
          req = req.order('occurred_on', { ascending: false }).order('created_at', { ascending: false })
      }
      const start = (q.page - 1) * q.pageSize
      const { data, error, count } = await req.range(start, start + q.pageSize - 1)
      fail(error)
      return { rows: (data ?? []).map(toTx), total: count ?? 0 }
    },
    async countTransactions() {
      const { count, error } = await sb.from('transactions').select('id', { count: 'exact', head: true })
      fail(error)
      return count ?? 0
    },
    async createTransaction(input) {
      const { data, error } = await sb.from('transactions').insert(input).select(TX_COLUMNS).single()
      fail(error)
      return toTx(data)
    },
    async updateTransaction(id, input) {
      const { data, error } = await sb.from('transactions').update(input).eq('id', id).select(TX_COLUMNS).single()
      fail(error)
      return toTx(data)
    },
    async deleteTransaction(id) {
      const { error } = await sb.from('transactions').delete().eq('id', id)
      fail(error)
    },

    async listBudgets() {
      const { data, error } = await sb.from('budgets').select('id,category_id,monthly_limit,is_sample').order('created_at')
      fail(error)
      return (data ?? []).map(toBudget)
    },
    async createBudget(input) {
      const { data, error } = await sb.from('budgets').insert(input).select('id,category_id,monthly_limit,is_sample').single()
      if (error?.code === '23505') throw new AppError('That category already has a budget.', 'duplicate')
      fail(error)
      return toBudget(data)
    },
    async updateBudget(id, input) {
      const { data, error } = await sb.from('budgets').update(input).eq('id', id).select('id,category_id,monthly_limit,is_sample').single()
      if (error?.code === '23505') throw new AppError('That category already has a budget.', 'duplicate')
      fail(error)
      return toBudget(data)
    },
    async deleteBudget(id) {
      const { error } = await sb.from('budgets').delete().eq('id', id)
      fail(error)
    },

    async insertSampleData(txs, budgets) {
      const { error } = await sb.from('transactions').insert(txs)
      fail(error)
      const existing = new Set((await this.listBudgets()).map((b) => b.category_id))
      const fresh = budgets.filter((b) => !existing.has(b.category_id)).map((b) => ({ ...b, is_sample: true }))
      if (fresh.length) {
        const { error: e2 } = await sb.from('budgets').insert(fresh)
        fail(e2)
      }
    },
    async removeSampleData() {
      const { error } = await sb.from('transactions').delete().eq('is_sample', true)
      fail(error)
      const { error: e2 } = await sb.from('budgets').delete().eq('is_sample', true)
      fail(e2)
    },
    async hasSampleData() {
      const { count, error } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('is_sample', true)
      fail(error)
      return (count ?? 0) > 0
    },
    async deleteAllTransactions() {
      const id = await uid()
      // RLS already scopes this to the user; the explicit filter is required by PostgREST for bulk deletes.
      const { error } = await sb.from('transactions').delete().eq('user_id', id)
      fail(error)
    },
    async exportTransactions() {
      return this.listTransactions({ from: '2000-01-01', to: '2100-01-01' })
    },
  }
}
