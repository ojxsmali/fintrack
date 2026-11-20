/**
 * Server state lives in TanStack Query: cached per key, de-duplicated, and
 * invalidated after every write so the dashboard reflects changes without a reload.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../services/auth'
import type { BudgetInput, DateRange, Profile, Transaction, TransactionInput, TransactionQuery, Account } from '../types/finance'

export const keys = {
  profile: ['profile'] as const,
  accounts: ['accounts'] as const,
  balances: ['balances'] as const,
  categories: ['categories'] as const,
  budgets: ['budgets'] as const,
  txRange: (r: DateRange) => ['transactions', 'range', r.from, r.to] as const,
  txQuery: (q: TransactionQuery) => ['transactions', 'query', q] as const,
  txCount: ['transactions', 'count'] as const,
  sample: ['transactions', 'sample'] as const,
}

const STALE = 30_000

export function useProfile() {
  const { repo } = useAuth()
  return useQuery({ queryKey: keys.profile, queryFn: () => repo.getProfile(), staleTime: 5 * 60_000 })
}

/** Display currency for formatting. Defaults to INR while the profile loads. */
export function useCurrency(): string {
  return useProfile().data?.currency ?? 'INR'
}

export function useAccounts() {
  const { repo } = useAuth()
  return useQuery({ queryKey: keys.accounts, queryFn: () => repo.listAccounts(), staleTime: 5 * 60_000 })
}

export function useBalances() {
  const { repo } = useAuth()
  return useQuery({ queryKey: keys.balances, queryFn: () => repo.listAccountBalances(), staleTime: STALE })
}

export function useCategories() {
  const { repo } = useAuth()
  return useQuery({ queryKey: keys.categories, queryFn: () => repo.listCategories(), staleTime: 10 * 60_000 })
}

export function useBudgets() {
  const { repo } = useAuth()
  return useQuery({ queryKey: keys.budgets, queryFn: () => repo.listBudgets(), staleTime: STALE })
}

export function useTransactionsInRange(range: DateRange) {
  const { repo } = useAuth()
  return useQuery({
    queryKey: keys.txRange(range),
    queryFn: () => repo.listTransactions(range),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  })
}

export function useTransactionPage(q: TransactionQuery) {
  const { repo } = useAuth()
  return useQuery({ queryKey: keys.txQuery(q), queryFn: () => repo.queryTransactions(q), staleTime: STALE, placeholderData: keepPreviousData })
}

export function useTransactionCount() {
  const { repo } = useAuth()
  return useQuery({ queryKey: keys.txCount, queryFn: () => repo.countTransactions(), staleTime: STALE })
}

export function useHasSampleData() {
  const { repo } = useAuth()
  return useQuery({ queryKey: keys.sample, queryFn: () => repo.hasSampleData(), staleTime: STALE })
}

function useInvalidateMoney() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: keys.balances }),
      qc.invalidateQueries({ queryKey: keys.budgets }),
    ])
}

export function useSaveTransaction() {
  const { repo } = useAuth()
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TransactionInput }): Promise<Transaction> =>
      id ? repo.updateTransaction(id, input) : repo.createTransaction(input),
    onSuccess: invalidate,
  })
}

export function useDeleteTransaction() {
  const { repo } = useAuth()
  const qc = useQueryClient()
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: (id: string) => repo.deleteTransaction(id),
    // Deleting is safe to apply optimistically: remove the row from cached pages now,
    // roll back if the server refuses.
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['transactions'] })
      const snapshot = qc.getQueriesData({ queryKey: ['transactions'] })
      qc.setQueriesData({ queryKey: ['transactions', 'range'] }, (old: unknown) =>
        Array.isArray(old) ? (old as Transaction[]).filter((t) => t.id !== id) : old,
      )
      qc.setQueriesData({ queryKey: ['transactions', 'query'] }, (old: unknown) => {
        const page = old as { rows: Transaction[]; total: number } | undefined
        if (!page?.rows) return old
        const rows = page.rows.filter((t) => t.id !== id)
        return { rows, total: page.total - (page.rows.length - rows.length) }
      })
      return { snapshot }
    },
    onError: (_e, _id, ctx) => ctx?.snapshot.forEach(([k, v]) => qc.setQueryData(k, v)),
    onSettled: invalidate,
  })
}

export function useSaveBudget() {
  const { repo } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: BudgetInput }) => (id ? repo.updateBudget(id, input) : repo.createBudget(input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.budgets }),
  })
}

export function useDeleteBudget() {
  const { repo } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.deleteBudget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.budgets }),
  })
}

export function useUpdateProfile() {
  const { repo } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Omit<Profile, 'id'>>) => repo.updateProfile(patch),
    onSuccess: (p) => qc.setQueryData(keys.profile, p),
  })
}

export function useSaveAccount() {
  const { repo } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: Omit<Account, 'id'> }) => (id ? repo.updateAccount(id, input) : repo.createAccount(input)),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.accounts }), qc.invalidateQueries({ queryKey: keys.balances })]),
  })
}

export function useSampleData() {
  const { repo } = useAuth()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries()
  const load = useMutation({
    mutationFn: async () => {
      const [{ buildSampleData }, categories, accounts] = await Promise.all([
        import('../lib/sampleData'),
        repo.listCategories(),
        repo.listAccounts(),
      ])
      if (!accounts[0]) throw new Error('No account')
      const plan = buildSampleData(categories, accounts[0].id)
      await repo.insertSampleData(plan.transactions, plan.budgets)
    },
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: () => repo.removeSampleData(), onSuccess: refresh })
  return { load, remove }
}
