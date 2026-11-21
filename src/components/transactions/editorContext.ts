import { createContext, useContext } from 'react'
import type { Transaction, TxType } from '../../types/finance'

export interface EditorApi {
  create(type?: TxType): void
  open(tx: Transaction): void
}

export const EditorContext = createContext<EditorApi | null>(null)

export function useTransactionEditor(): EditorApi {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useTransactionEditor must be used inside <TransactionEditorProvider>')
  return ctx
}
