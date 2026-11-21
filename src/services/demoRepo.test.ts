import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoRepo, freshDemoState, type DemoStorage } from './demoRepo'
import { AppError } from './repository'
import { authMessage } from './authContext'
import type { FinanceRepo } from './repository'

function memoryStorage(): DemoStorage {
  let state: ReturnType<typeof freshDemoState> | null = freshDemoState('Ojas')
  return { load: () => (state ? structuredClone(state) : null), save: (s) => void (state = structuredClone(s)) }
}

let repo: FinanceRepo
beforeEach(() => {
  repo = createDemoRepo(memoryStorage(), 0)
})

async function ids() {
  const [cats, accounts] = await Promise.all([repo.listCategories(), repo.listAccounts()])
  const id = (name: string) => cats.find((c) => c.name === name)!.id
  return { food: id('Food'), salary: id('Salary'), account: accounts[0].id }
}

describe('transactions repository', () => {
  it('creates, edits and deletes a transaction, and balances follow', async () => {
    const { food, salary, account } = await ids()
    await repo.createTransaction({ type: 'income', amount: 42000, category_id: salary, account_id: account, merchant: 'Employer', description: '', notes: '', occurred_on: '2026-11-15' })
    const t = await repo.createTransaction({ type: 'expense', amount: 420, category_id: food, account_id: account, merchant: 'Swiggy', description: '', notes: '', occurred_on: '2026-11-14' })
    expect((await repo.listAccountBalances())[0].balance).toBe(41580)

    const edited = await repo.updateTransaction(t.id, { ...t, amount: 500, notes: 'Team lunch' })
    expect(edited).toMatchObject({ amount: 500, notes: 'Team lunch' })
    expect((await repo.listAccountBalances())[0].balance).toBe(41500)

    await repo.deleteTransaction(t.id)
    expect(await repo.countTransactions()).toBe(1)
    expect((await repo.listAccountBalances())[0].balance).toBe(42000)
  })

  it('rejects a category whose kind does not match the type (mirrors the DB foreign key)', async () => {
    const { salary, account } = await ids()
    await expect(
      repo.createTransaction({ type: 'expense', amount: 10, category_id: salary, account_id: account, merchant: 'x', description: '', notes: '', occurred_on: '2026-11-01' }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('filters, searches, sorts and paginates', async () => {
    const { food, account } = await ids()
    for (let i = 1; i <= 30; i++) {
      await repo.createTransaction({ type: 'expense', amount: i * 10, category_id: food, account_id: account, merchant: i % 2 ? 'Swiggy' : 'Zomato', description: '', notes: '', occurred_on: `2026-11-${String(i).padStart(2, '0')}` })
    }
    const page1 = await repo.queryTransactions({ page: 1, pageSize: 25, sort: 'date_desc' })
    expect(page1.total).toBe(30)
    expect(page1.rows).toHaveLength(25)
    expect(page1.rows[0].occurred_on).toBe('2026-11-30')
    const page2 = await repo.queryTransactions({ page: 2, pageSize: 25 })
    expect(page2.rows).toHaveLength(5)
    const search = await repo.queryTransactions({ page: 1, pageSize: 50, search: 'zomato' })
    expect(search.total).toBe(15)
    const byAmount = await repo.queryTransactions({ page: 1, pageSize: 1, sort: 'amount_desc', range: { from: '2026-11-01', to: '2026-11-10' } })
    expect(byAmount.rows[0].amount).toBe(100)
  })
})

describe('budgets repository', () => {
  it('allows one budget per category', async () => {
    const { food } = await ids()
    const b = await repo.createBudget({ category_id: food, monthly_limit: 8000 })
    await expect(repo.createBudget({ category_id: food, monthly_limit: 1 })).rejects.toThrow('That category already has a budget.')
    expect(await repo.updateBudget(b.id, { category_id: food, monthly_limit: 9000 })).toMatchObject({ monthly_limit: 9000 })
    await repo.deleteBudget(b.id)
    expect(await repo.listBudgets()).toEqual([])
  })
})

describe('sample data', () => {
  it('is flagged and removable without touching real data', async () => {
    const { buildSampleData } = await import('../lib/sampleData')
    const { food, account } = await ids()
    await repo.createTransaction({ type: 'expense', amount: 99, category_id: food, account_id: account, merchant: 'Mine', description: '', notes: '', occurred_on: '2026-11-01' })
    const plan = buildSampleData(await repo.listCategories(), account, new Date(2026, 10, 20))
    expect(plan.transactions.every((t) => t.is_sample && t.amount > 0 && t.occurred_on <= '2026-11-20')).toBe(true)
    // A full year back, so "last 6 months" can always be compared with the 6 months before it.
    const months = new Set(plan.transactions.map((t) => t.occurred_on.slice(0, 7)))
    expect(months.size).toBe(13)
    expect([...months].sort()[0]).toBe('2025-11')
    await repo.insertSampleData(plan.transactions, plan.budgets)
    expect(await repo.hasSampleData()).toBe(true)
    await repo.removeSampleData()
    expect(await repo.countTransactions()).toBe(1)
    expect(await repo.listBudgets()).toEqual([])
  })
})

describe('auth error messages', () => {
  it('maps provider errors to human copy and never leaks raw messages', () => {
    expect(authMessage('Invalid login credentials')).toMatch(/don’t match/)
    expect(authMessage('User already registered')).toMatch(/already exists/)
    expect(authMessage('duplicate key value violates unique constraint "x"')).toBe('We couldn’t sign you in right now. Please try again.')
  })
})
