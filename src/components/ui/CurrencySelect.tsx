import { forwardRef, useMemo, type SelectHTMLAttributes } from 'react'
import { Select } from './Field'
import { allCurrencies, POPULAR_CURRENCIES } from '../../lib/format'

/** Every supported currency: popular ones first, then A–Z by name. */
export const CurrencySelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function CurrencySelect(props, ref) {
  const { popular, rest } = useMemo(() => {
    const all = allCurrencies()
    const byCode = new Map(all.map((c) => [c.code, c]))
    const popular = POPULAR_CURRENCIES.map((c) => byCode.get(c)).filter((c): c is NonNullable<typeof c> => !!c)
    const popularSet = new Set<string>(POPULAR_CURRENCIES)
    return { popular, rest: all.filter((c) => !popularSet.has(c.code)) }
  }, [])
  const label = (c: { code: string; name: string; symbol: string }) => `${c.name} — ${c.code}${c.symbol !== c.code ? ` (${c.symbol})` : ''}`
  return (
    <Select ref={ref} {...props}>
      <optgroup label="Popular">
        {popular.map((c) => (
          <option key={c.code} value={c.code}>
            {label(c)}
          </option>
        ))}
      </optgroup>
      <optgroup label="All currencies">
        {rest.map((c) => (
          <option key={c.code} value={c.code}>
            {label(c)}
          </option>
        ))}
      </optgroup>
    </Select>
  )
})
