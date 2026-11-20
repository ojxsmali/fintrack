import { useState } from 'react'
import { useAuth } from '../services/auth'
import { useAccounts, useCategories } from './useFinance'
import { useToast } from '../components/ui/Toast'
import { friendlyError } from '../services/repository'
import { today } from '../lib/dates'

/** Neutralise spreadsheet formula injection and quote every cell. */
export function csvCell(v: string | number): string {
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export function useExportCsv() {
  const { repo } = useAuth()
  const { data: categories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()
  const toast = useToast()
  const [pending, setPending] = useState(false)

  const run = async () => {
    setPending(true)
    try {
      const txs = await repo.exportTransactions()
      const cat = new Map(categories.map((c) => [c.id, c.name]))
      const acc = new Map(accounts.map((a) => [a.id, a.name]))
      const header = ['date', 'type', 'amount', 'merchant', 'category', 'account', 'description', 'notes', 'sample']
      const lines = txs.map((t) =>
        [t.occurred_on, t.type, t.amount.toFixed(2), t.merchant, cat.get(t.category_id) ?? '', acc.get(t.account_id) ?? '', t.description, t.notes, t.is_sample ? 'yes' : 'no']
          .map(csvCell)
          .join(','),
      )
      const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fintrack-transactions-${today()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast(`Exported ${txs.length} transactions`)
    } catch (e) {
      toast(friendlyError(e), { tone: 'error' })
    } finally {
      setPending(false)
    }
  }
  return { run, pending }
}
