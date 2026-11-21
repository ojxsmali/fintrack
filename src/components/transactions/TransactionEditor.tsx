import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { EditorContext, type EditorApi } from './editorContext'
import { Pencil, Trash2 } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { TxAmount } from '../ui/Money'
import { useToast } from '../ui/toastContext'
import { useAccounts, useCategories, useCurrency, useDeleteTransaction, useSaveTransaction } from '../../hooks/useFinance'
import { validateTransaction, type FieldErrors, type TransactionDraft } from '../../lib/validation'
import { currencySymbol } from '../../lib/format'
import { fmt, today } from '../../lib/dates'
import { friendlyError } from '../../services/repository'
import type { Transaction, TxType } from '../../types/finance'

type Mode = { kind: 'closed' } | { kind: 'create'; type?: TxType } | { kind: 'view'; tx: Transaction } | { kind: 'edit'; tx: Transaction }

export function TransactionEditorProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>({ kind: 'closed' })
  const api = useMemo<EditorApi>(
    () => ({ create: (type) => setMode({ kind: 'create', type }), open: (tx) => setMode({ kind: 'view', tx }) }),
    [],
  )
  const close = useCallback(() => setMode({ kind: 'closed' }), [])

  // "N" opens Add transaction — unless the person is typing or a dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' && e.key !== 'N') return
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      if (document.querySelector('dialog[open]')) return
      e.preventDefault()
      setMode({ kind: 'create' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <EditorContext.Provider value={api}>
      {children}
      <TransactionDrawer mode={mode} setMode={setMode} onClose={close} />
    </EditorContext.Provider>
  )
}

function TransactionDrawer({ mode, setMode, onClose }: { mode: Mode; setMode: (m: Mode) => void; onClose: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const del = useDeleteTransaction()
  const toast = useToast()
  const open = mode.kind !== 'closed'
  const title = mode.kind === 'create' ? 'Add transaction' : mode.kind === 'edit' ? 'Edit transaction' : 'Transaction'

  const doDelete = async () => {
    if (mode.kind !== 'view' && mode.kind !== 'edit') return
    try {
      await del.mutateAsync(mode.tx.id)
      setConfirmDelete(false)
      onClose()
      toast('Transaction deleted')
    } catch (e) {
      toast(friendlyError(e), { tone: 'error' })
    }
  }

  return (
    <>
      <Dialog open={open && !confirmDelete} onClose={onClose} title={title} variant="drawer">
        {mode.kind === 'view' && (
          <TransactionDetails
            tx={mode.tx}
            onEdit={() => setMode({ kind: 'edit', tx: mode.tx })}
            onDelete={() => setConfirmDelete(true)}
          />
        )}
        {(mode.kind === 'create' || mode.kind === 'edit') && (
          <TransactionForm
            key={mode.kind === 'edit' ? mode.tx.id : 'new'}
            initial={mode.kind === 'edit' ? mode.tx : undefined}
            defaultType={mode.kind === 'create' ? mode.type : undefined}
            onCancel={() => (mode.kind === 'edit' ? setMode({ kind: 'view', tx: mode.tx }) : onClose())}
            onSaved={(tx) => (mode.kind === 'edit' ? setMode({ kind: 'view', tx }) : onClose())}
          />
        )}
      </Dialog>
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this transaction?"
        description="It will be removed from your history, budgets and charts. This can’t be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={doDelete} loading={del.isPending}>
              Delete
            </Button>
          </>
        }
      />
    </>
  )
}

function TransactionDetails({ tx, onEdit, onDelete }: { tx: Transaction; onEdit: () => void; onDelete: () => void }) {
  const { data: categories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()
  const category = categories.find((c) => c.id === tx.category_id)?.name ?? '—'
  const account = accounts.find((a) => a.id === tx.account_id)?.name ?? '—'
  const rows: [string, ReactNode][] = [
    ['Category', category],
    ['Date', fmt.full(tx.occurred_on)],
    ['Account', account],
    ['Type', tx.type === 'income' ? 'Income' : 'Expense'],
    ['Description', tx.description || <span className="text-ink-4">None</span>],
  ]
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line pb-5">
        <p className="text-sm text-ink-3">{tx.merchant}</p>
        <p className="mt-1 text-3xl font-medium tracking-[-0.02em]">
          <TxAmount amount={tx.amount} type={tx.type} />
        </p>
        {tx.is_sample && <p className="mt-2 inline-block rounded-xs bg-sunken px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-ink-3">Sample data</p>}
      </div>
      <dl className="divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_1fr] gap-4 py-3 text-sm">
            <dt className="text-ink-3">{k}</dt>
            <dd className="text-ink">{v}</dd>
          </div>
        ))}
        <div className="py-3 text-sm">
          <dt className="text-ink-3">Notes</dt>
          <dd className="mt-1 whitespace-pre-wrap text-ink">{tx.notes || <span className="text-ink-4">No notes</span>}</dd>
        </div>
      </dl>
      <div className="mt-auto flex gap-2 pt-6">
        <Button variant="secondary" icon={<Pencil size={15} />} onClick={onEdit} className="flex-1">
          Edit
        </Button>
        <Button variant="ghost" icon={<Trash2 size={15} />} onClick={onDelete} className="text-negative hover:text-negative">
          Delete
        </Button>
      </div>
    </div>
  )
}

function TransactionForm({
  initial,
  defaultType,
  onCancel,
  onSaved,
}: {
  initial?: Transaction
  defaultType?: TxType
  onCancel: () => void
  onSaved: (tx: Transaction) => void
}) {
  const { data: categories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()
  const currency = useCurrency()
  const save = useSaveTransaction()
  const toast = useToast()
  const amountRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState<TransactionDraft>(() => ({
    type: initial?.type ?? defaultType ?? 'expense',
    amount: initial ? String(initial.amount) : '',
    category_id: initial?.category_id ?? '',
    account_id: initial?.account_id ?? '',
    merchant: initial?.merchant ?? '',
    occurred_on: initial?.occurred_on ?? today(),
    description: initial?.description ?? '',
    notes: initial?.notes ?? '',
  }))
  const [errors, setErrors] = useState<FieldErrors<keyof TransactionDraft>>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Default to the first account without an extra render.
  const accountId = draft.account_id || accounts[0]?.id || ''

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  const set = <K extends keyof TransactionDraft>(k: K, v: TransactionDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const changeType = (type: TxType) => {
    const keep = categories.find((c) => c.id === draft.category_id)?.kind === type
    setDraft((d) => ({ ...d, type, category_id: keep ? d.category_id : '' }))
  }

  const options = categories.filter((c) => c.kind === draft.type)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const res = validateTransaction({ ...draft, account_id: accountId }, { categories, accountIds: accounts.map((a) => a.id) })
    if (!res.ok) {
      setErrors(res.errors)
      return
    }
    try {
      const tx = await save.mutateAsync({ id: initial?.id, input: res.value })
      toast(initial ? 'Transaction updated' : `${draft.type === 'income' ? 'Income' : 'Expense'} added`)
      onSaved(tx)
    } catch (err) {
      setFormError(friendlyError(err))
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex h-full flex-col gap-4">
      <Segmented
        label="Transaction type"
        value={draft.type}
        onChange={changeType}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
        className="w-full"
      />
      <Field label="Amount" error={errors.amount}>
        {(p) => (
          <Input
            {...p}
            ref={amountRef}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            prefix={currencySymbol(currency)}
            value={draft.amount}
            onChange={(e) => set('amount', e.target.value)}
            className="num h-12 text-xl! font-medium"
          />
        )}
      </Field>
      <Field label={draft.type === 'income' ? 'From' : 'Merchant'} error={errors.merchant}>
        {(p) => (
          <Input
            {...p}
            placeholder={draft.type === 'income' ? 'e.g. Employer, client' : 'e.g. Swiggy, Uber'}
            value={draft.merchant}
            maxLength={80}
            onChange={(e) => set('merchant', e.target.value)}
          />
        )}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category" error={errors.category_id}>
          {(p) => (
            <Select {...p} value={draft.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="" disabled>
                Choose…
              </option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Date" error={errors.occurred_on}>
          {(p) => <Input {...p} type="date" value={draft.occurred_on} onChange={(e) => set('occurred_on', e.target.value)} />}
        </Field>
      </div>
      <Field label="Account" error={errors.account_id}>
        {(p) => (
          <Select {...p} value={accountId} onChange={(e) => set('account_id', e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Description" optional error={errors.description}>
        {(p) => <Input {...p} maxLength={140} value={draft.description} onChange={(e) => set('description', e.target.value)} />}
      </Field>
      <Field label="Notes" optional error={errors.notes}>
        {(p) => <Textarea {...p} rows={3} maxLength={1000} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />}
      </Field>

      {formError && (
        <p role="alert" className="rounded-sm bg-negative-soft px-3 py-2 text-sm text-negative">
          {formError}
        </p>
      )}

      <div className="mt-auto flex gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1 sm:flex-none">
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} className="flex-1">
          {initial ? 'Save changes' : draft.type === 'income' ? 'Add income' : 'Add expense'}
        </Button>
      </div>
    </form>
  )
}
