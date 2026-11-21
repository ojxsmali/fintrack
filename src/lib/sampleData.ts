/**
 * Development / demo sample data. Every row produced here is flagged
 * `is_sample = true` and can be removed from Settings → Data in one action.
 * It is illustrative only and is never presented as real financial history.
 */
import type { BudgetInput, Category, TransactionInput } from '../types/finance'
import { addMonths, daysInMonth, toISODate } from './dates'

/** Small deterministic PRNG so the sample set is stable across loads. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Spec = { cat: string; merchant: string; min: number; max: number; desc?: string }

const DINING: Spec[] = [
  { cat: 'Food', merchant: 'Swiggy', min: 240, max: 720, desc: 'Dinner delivery' },
  { cat: 'Food', merchant: 'Zomato', min: 260, max: 680, desc: 'Lunch delivery' },
  { cat: 'Food', merchant: 'Blue Tokai Coffee', min: 180, max: 420 },
  { cat: 'Food', merchant: 'Third Wave Coffee', min: 160, max: 380 },
  { cat: 'Food', merchant: 'Toit', min: 1400, max: 2600, desc: 'Dinner with friends' },
]
const GROCERY: Spec[] = [
  { cat: 'Groceries', merchant: 'BigBasket', min: 1100, max: 2800, desc: 'Weekly groceries' },
  { cat: 'Groceries', merchant: 'Zepto', min: 220, max: 760 },
  { cat: 'Groceries', merchant: 'Nature’s Basket', min: 600, max: 1500 },
]
const TRANSPORT: Spec[] = [
  { cat: 'Transport', merchant: 'Uber', min: 160, max: 520 },
  { cat: 'Transport', merchant: 'Namma Metro', min: 40, max: 90, desc: 'Metro card top-up' },
  { cat: 'Transport', merchant: 'Rapido', min: 70, max: 180 },
  { cat: 'Transport', merchant: 'Shell', min: 900, max: 1600, desc: 'Fuel' },
]
const SHOPPING: Spec[] = [
  { cat: 'Shopping', merchant: 'Amazon', min: 450, max: 3400 },
  { cat: 'Shopping', merchant: 'Myntra', min: 900, max: 2800 },
  { cat: 'Shopping', merchant: 'IKEA', min: 1200, max: 4200, desc: 'Home' },
]
const FUN: Spec[] = [
  { cat: 'Entertainment', merchant: 'PVR Cinemas', min: 380, max: 900 },
  { cat: 'Entertainment', merchant: 'BookMyShow', min: 500, max: 1800, desc: 'Concert tickets' },
]

export interface SamplePlan {
  transactions: (TransactionInput & { is_sample: true })[]
  budgets: BudgetInput[]
}

export function buildSampleData(categories: Category[], accountId: string, now = new Date()): SamplePlan {
  const rand = rng(20261120)
  const byName = new Map(categories.map((c) => [`${c.kind}:${c.name.toLowerCase()}`, c.id]))
  const cat = (name: string, kind: 'income' | 'expense' = 'expense') =>
    byName.get(`${kind}:${name.toLowerCase()}`) ?? byName.get(`${kind}:other${kind === 'income' ? ' income' : ''}`)!
  const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) / 10) * 10
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]

  const out: SamplePlan['transactions'] = []
  const todayISO = toISODate(now)
  const push = (date: Date, kind: 'income' | 'expense', category: string, merchant: string, amount: number, description = '') => {
    const iso = toISODate(date)
    if (iso > todayISO) return
    out.push({
      type: kind,
      amount,
      category_id: cat(category, kind),
      account_id: accountId,
      merchant,
      description,
      notes: '',
      occurred_on: iso,
      is_sample: true,
    })
  }

  // A full year plus the current month, so every default period (incl. "last 6 months" vs the 6 before) can compare.
  for (let m = -12; m <= 0; m++) {
    const month = addMonths(now, m)
    const y = month.getFullYear()
    const mo = month.getMonth()
    const dim = daysInMonth(month)
    const d = (day: number) => new Date(y, mo, Math.min(day, dim))

    push(d(1), 'income', 'Salary', 'Northwind Labs', 92000, 'Monthly salary')
    if (m % 2 !== 0) push(d(8 + Math.floor(rand() * 12)), 'income', 'Freelance', pick(['Lumen Studio', 'Kite Design Co.']), between(9000, 24000), 'Freelance project')
    if (mo % 3 === 2) push(d(28), 'income', 'Interest', 'Savings interest', between(600, 900), 'Quarterly interest')

    push(d(3), 'expense', 'Housing', 'Rent — Indiranagar flat', 26000, 'Monthly rent')
    push(d(6), 'expense', 'Bills', 'BESCOM', between(1300, 2300), 'Electricity')
    push(d(9), 'expense', 'Bills', 'Airtel Xstream Fiber', 999, 'Broadband')
    push(d(12), 'expense', 'Bills', 'Jio', 349, 'Mobile plan')
    push(d(5), 'expense', 'Subscriptions', 'Netflix', 649)
    push(d(14), 'expense', 'Subscriptions', 'Spotify', 119)
    push(d(20), 'expense', 'Subscriptions', 'iCloud+', 75)
    push(d(2), 'expense', 'Health', 'Cult.fit', 1800, 'Gym membership')
    if (rand() < 0.4) push(d(10 + Math.floor(rand() * 15)), 'expense', 'Health', 'Apollo Pharmacy', between(250, 1100))

    // Recent months run a touch hotter on dining so insights have something real to say.
    const diningCount = 7 + Math.floor(rand() * 4) + (m === 0 ? 2 : 0)
    for (let i = 0; i < diningCount; i++) {
      const s = pick(DINING)
      push(d(1 + Math.floor(rand() * dim)), 'expense', s.cat, s.merchant, between(s.min, s.max), s.desc)
    }
    for (let w = 0; w < 4; w++) {
      const s = w % 2 === 0 ? GROCERY[0] : pick(GROCERY)
      push(d(4 + w * 7 + Math.floor(rand() * 3)), 'expense', s.cat, s.merchant, between(s.min, s.max), s.desc)
    }
    const rides = 6 + Math.floor(rand() * 6)
    for (let i = 0; i < rides; i++) {
      const s = pick(TRANSPORT)
      push(d(1 + Math.floor(rand() * dim)), 'expense', s.cat, s.merchant, between(s.min, s.max), s.desc)
    }
    const shops = 1 + Math.floor(rand() * 3)
    for (let i = 0; i < shops; i++) {
      const s = pick(SHOPPING)
      push(d(1 + Math.floor(rand() * dim)), 'expense', s.cat, s.merchant, between(s.min, s.max), s.desc)
    }
    const fun = 1 + Math.floor(rand() * 2)
    for (let i = 0; i < fun; i++) {
      const s = pick(FUN)
      push(d(1 + Math.floor(rand() * dim)), 'expense', s.cat, s.merchant, between(s.min, s.max), s.desc)
    }
    if (m === -4) push(d(17), 'expense', 'Travel', 'IndiGo', 8400, 'Flights to Goa')
    if (m === -4) push(d(18), 'expense', 'Travel', 'Airbnb', 11200, 'Goa, 3 nights')
    if (m === -2) push(d(22), 'expense', 'Education', 'Coursera', 3990, 'Data visualisation course')
    if (m === -1) push(d(11), 'expense', 'Travel', 'MakeMyTrip', 5600, 'Train + hotel, Mysuru')
  }

  out.sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1))

  const budgets: BudgetInput[] = [
    { category_id: cat('Food'), monthly_limit: 6000 },
    { category_id: cat('Groceries'), monthly_limit: 7000 },
    { category_id: cat('Transport'), monthly_limit: 4000 },
    { category_id: cat('Shopping'), monthly_limit: 5000 },
    { category_id: cat('Entertainment'), monthly_limit: 2000 },
  ]
  return { transactions: out, budgets }
}
