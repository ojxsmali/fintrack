import { formatCurrency, formatTxAmount } from '../../lib/format'
import { useCurrency } from '../../hooks/useFinance'
import type { TxType } from '../../types/finance'

/** Plain amount, tabular figures, currency from the user's profile. */
export function Money({ amount, className = '', compact }: { amount: number; className?: string; compact?: boolean }) {
  const currency = useCurrency()
  return <span className={`num ${className}`}>{formatCurrency(amount, currency, { compact })}</span>
}

/** Transaction amount: income gets + and moss green; expenses stay ink (spending is normal, not an error). */
export function TxAmount({ amount, type, className = '' }: { amount: number; type: TxType; className?: string }) {
  const currency = useCurrency()
  return (
    <span className={`num whitespace-nowrap ${type === 'income' ? 'text-positive' : 'text-ink'} ${className}`}>
      {formatTxAmount(amount, type, currency)}
    </span>
  )
}
