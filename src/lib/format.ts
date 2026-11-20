/**
 * All money formatting goes through here so no component hardcodes a symbol.
 * Every ISO-4217 currency the browser knows is supported; amounts are stored
 * as plain numbers in the workspace's currency (no FX conversion).
 */

/** English locales whose digit grouping matches each currency's home convention. */
const LOCALE_FOR_CURRENCY: Record<string, string> = {
  INR: 'en-IN', NPR: 'en-IN', BDT: 'en-IN', PKR: 'en-PK', LKR: 'en-IN',
  USD: 'en-US', EUR: 'en-IE', GBP: 'en-GB', AUD: 'en-AU', CAD: 'en-CA', NZD: 'en-NZ',
  SGD: 'en-SG', HKD: 'en-HK', ZAR: 'en-ZA', NGN: 'en-NG', KES: 'en-KE', PHP: 'en-PH',
  MYR: 'en-MY', AED: 'en-AE', JPY: 'en-JP', CHF: 'en-CH',
}

/** Shown first in pickers. */
export const POPULAR_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'CHF'] as const

const NOT_MONEY = new Set([
  // accounting units, metals and test codes
  'XDR', 'XSU', 'XAU', 'XAG', 'XPT', 'XPD', 'XTS', 'XXX', 'XBA', 'XBB', 'XBC', 'XBD', 'XUA',
  // retired currencies some runtimes still list
  'HRK', 'CUC', 'BYR', 'VEF', 'MRO', 'STD', 'LTL', 'LVL', 'EEK', 'SLL', 'ZWL',
])
const FALLBACK = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'SGD', 'HKD', 'AED', 'SAR', 'ZAR', 'BRL', 'MXN', 'KRW', 'NZD', 'SEK', 'NOK', 'DKK', 'PKR', 'BDT', 'NPR', 'LKR', 'IDR', 'MYR', 'THB', 'PHP', 'VND', 'TRY', 'RUB', 'PLN', 'NGN', 'KES', 'EGP']

export interface CurrencyOption {
  code: string
  name: string
  symbol: string
}

let cachedOptions: CurrencyOption[] | null = null

/** Every current currency the runtime supports, sorted by name, excluding non-money and retired codes. */
export function allCurrencies(): CurrencyOption[] {
  if (cachedOptions) return cachedOptions
  let codes: string[] = FALLBACK
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('currency')
    if (supported?.length) codes = supported
  } catch {
    /* older browser: use the fallback list */
  }
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames(['en'], { type: 'currency' })
  } catch {
    names = null
  }
  cachedOptions = codes
    .filter((c) => /^[A-Z]{3}$/.test(c) && !NOT_MONEY.has(c))
    .map((code) => ({ code, name: names?.of(code) ?? code, symbol: currencySymbol(code) }))
    .filter((o) => !/\(\d{4}/.test(o.name)) // retired, e.g. "Sierra Leonean Leone (1964—2022)"
    .sort((a, b) => a.name.localeCompare(b.name))
  return cachedOptions
}

export function isSupportedCurrency(code: string): boolean {
  return allCurrencies().some((c) => c.code === code)
}

export function localeFor(currency: string): string {
  return LOCALE_FOR_CURRENCY[currency] ?? 'en-US'
}

/** Minor-unit digits for a currency: 2 for INR/USD, 0 for JPY, 3 for KWD… */
export function currencyDecimals(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

const cache = new Map<string, Intl.NumberFormat>()
function formatter(currency: string, decimals: number, compact: boolean): Intl.NumberFormat {
  const key = `${currency}|${decimals}|${compact}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(localeFor(currency), {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: compact ? 0 : decimals,
      maximumFractionDigits: compact ? 1 : decimals,
      notation: compact ? 'compact' : 'standard',
    })
    cache.set(key, f)
  }
  return f
}

export interface MoneyFormatOptions {
  /** 'always' prefixes + for positives; 'negative' only shows − for negatives. */
  sign?: 'always' | 'negative'
  /** Show paise/cents. Defaults to only when the value has them. */
  decimals?: number
  compact?: boolean
}

export function formatCurrency(amount: number, currency = 'INR', opts: MoneyFormatOptions = {}): string {
  if (!Number.isFinite(amount)) return '—'
  const abs = Math.abs(amount)
  // Whole amounts print without decimals; otherwise use the currency's own minor units.
  const decimals = opts.decimals ?? (Math.round(abs * 100) % 100 === 0 ? 0 : currencyDecimals(currency))
  const body = formatter(currency, decimals, !!opts.compact).format(abs)
  const isNeg = amount < 0 && Math.round(abs * 100) !== 0
  if (isNeg) return `−${body}` // true minus sign, not hyphen
  if (opts.sign === 'always' && abs > 0) return `+${body}`
  return body
}

/** Signed amount for a transaction: income positive, expense negative. */
export function formatTxAmount(amount: number, type: 'income' | 'expense', currency: string): string {
  return formatCurrency(type === 'income' ? amount : -amount, currency, { sign: 'always' })
}

export function formatPercent(value: number | null, opts: { sign?: boolean; digits?: number } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—'
  // Whole percents by default: financial summaries don't need false precision.
  const digits = opts.digits ?? 0
  const rounded = value.toFixed(digits)
  const n = Number(rounded)
  if (n < 0) return `−${Math.abs(n).toFixed(digits)}%`
  if (opts.sign && n > 0) return `+${rounded}%`
  return `${rounded}%`
}

/** Currency symbol for input adornments. */
export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(localeFor(currency), { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}
