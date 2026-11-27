import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFrame, TooltipCard } from './ChartFrame'
import { CHART } from './chartColors'
import { formatCurrency, formatPercent } from '../../lib/format'
import { fmt } from '../../lib/dates'
import type { BalancePoint, MonthPoint, PacePoint } from '../../lib/finance'

/** Series draw in once on mount; skipped for reduced motion (and in test environments without matchMedia). */
const animate = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

const axisProps = { tickLine: false, axisLine: false, stroke: CHART.axis, fontSize: 11 } as const

/**
 * Cumulative spending by day of month. Cumulative (not daily bars) because the
 * question is "am I on pace?" — daily bars are spiky and hide the trajectory.
 */
export function SpendingPaceChart({
  data,
  currency,
  currentLabel,
  previousLabel,
  summary,
}: {
  data: PacePoint[]
  currency: string
  currentLabel: string
  previousLabel: string
  summary: string
}) {
  const money = (n: number) => formatCurrency(n, currency)
  return (
    <ChartFrame
      id="pace"
      title="Spending this month"
      summary={summary}
      legend={[
        { label: currentLabel, color: CHART.current },
        { label: previousLabel, color: CHART.previous, dashed: true },
      ]}
      table={{
        columns: ['Day', currentLabel, previousLabel],
        rows: data.map((d) => [d.day, d.current === null ? '—' : money(d.current), d.previous === null ? '—' : money(d.previous)]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="day" {...axisProps} interval="preserveStartEnd" minTickGap={24} tickFormatter={(d) => String(d)} />
          <YAxis {...axisProps} width={56} tickFormatter={(v) => formatCurrency(v, currency, { compact: true })} />
          <Tooltip
            cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={`Day ${label}`}
                  rows={[
                    { label: currentLabel, value: payload.find((p) => p.dataKey === 'current')?.value != null ? money(Number(payload.find((p) => p.dataKey === 'current')!.value)) : '—', color: CHART.current },
                    { label: previousLabel, value: payload.find((p) => p.dataKey === 'previous')?.value != null ? money(Number(payload.find((p) => p.dataKey === 'previous')!.value)) : '—', color: CHART.previous, dashed: true },
                  ]}
                />
              ) : null
            }
          />
          <Line type="monotone" dataKey="previous" stroke={CHART.previous} strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fffcf4' }} isAnimationActive={animate} animationDuration={900} animationEasing="ease-out" connectNulls={false} />
          <Line type="monotone" dataKey="current" stroke={CHART.current} strokeWidth={2.25} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fffcf4' }} isAnimationActive={animate} animationDuration={900} animationEasing="ease-out" connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function IncomeExpenseChart({ data, currency, summary }: { data: MonthPoint[]; currency: string; summary: string }) {
  const money = (n: number) => formatCurrency(n, currency)
  const rows = data.map((d) => ({ ...d, label: fmt.monthOfKey(d.key) }))
  return (
    <ChartFrame
      id="income-expense"
      title="Income and spending by month"
      summary={summary}
      legend={[
        { label: 'Income', color: CHART.income },
        { label: 'Spending', color: CHART.expense },
      ]}
      table={{ columns: ['Month', 'Income', 'Spending', 'Net'], rows: data.map((d) => [fmt.monthOfKey(d.key), money(d.income), money(d.expense), formatCurrency(d.net, currency, { sign: 'always' })]) }}
      height={260}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={2} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={56} tickFormatter={(v) => formatCurrency(v, currency, { compact: true })} />
          <Tooltip
            cursor={{ fill: 'rgb(198 244 94 / 0.06)' }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (MonthPoint & { label: string }) | undefined
              return active && p ? (
                <TooltipCard
                  title={fmt.monthYear(new Date(`${p.key}-01T00:00:00`))}
                  rows={[
                    { label: 'Income', value: money(p.income), color: CHART.income },
                    { label: 'Spending', value: money(p.expense), color: CHART.expense },
                    { label: 'Net', value: formatCurrency(p.net, currency, { sign: 'always' }) },
                  ]}
                />
              ) : null
            }}
          />
          <Bar dataKey="income" fill={CHART.income} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={animate} animationDuration={900} animationEasing="ease-out" />
          <Bar dataKey="expense" fill={CHART.expense} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={animate} animationDuration={900} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function SavingsRateChart({ data, summary }: { data: MonthPoint[]; summary: string }) {
  const rows = data.map((d) => ({ label: fmt.monthOfKey(d.key), key: d.key, rate: d.savingsRate === null ? null : Math.round(d.savingsRate * 10) / 10 }))
  return (
    <ChartFrame
      id="savings-rate"
      title="Savings rate"
      summary={summary}
      table={{ columns: ['Month', 'Savings rate'], rows: rows.map((r) => [r.label, formatPercent(r.rate)]) }}
      height={200}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap="32%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={40} tickFormatter={(v) => `${v}%`} />
          <ReferenceLine y={0} stroke={CHART.axis} />
          <Tooltip
            cursor={{ fill: 'rgb(198 244 94 / 0.06)' }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { label: string; rate: number | null } | undefined
              return active && p ? <TooltipCard title={p.label} rows={[{ label: 'Saved of income', value: formatPercent(p.rate) }]} /> : null
            }}
          />
          <Bar dataKey="rate" fill={CHART.single} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={animate} animationDuration={900} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

/** Month-end balance across all accounts — single series, so no legend box. */
export function BalanceChart({ data, currency, summary }: { data: BalancePoint[]; currency: string; summary: string }) {
  const money = (n: number) => formatCurrency(n, currency)
  const rows = data.map((d) => ({ ...d, label: fmt.monthOfKey(d.key) }))
  const min = Math.min(0, ...data.map((d) => d.balance))
  return (
    <ChartFrame
      id="balance"
      title="Balance over time"
      summary={summary}
      table={{ columns: ['Month end', 'Balance'], rows: rows.map((r) => [r.label, money(r.balance)]) }}
      height={220}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.single} stopOpacity={0.14} />
              <stop offset="100%" stopColor={CHART.single} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={56} domain={[min, 'auto']} tickFormatter={(v) => formatCurrency(v, currency, { compact: true })} />
          {min < 0 && <ReferenceLine y={0} stroke={CHART.axis} />}
          <Tooltip
            cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (BalancePoint & { label: string }) | undefined
              return active && p ? <TooltipCard title={`End of ${fmt.monthYear(new Date(`${p.key}-01T00:00:00`))}`} rows={[{ label: 'Balance', value: money(p.balance) }]} /> : null
            }}
          />
          <Area type="monotone" dataKey="balance" stroke={CHART.single} strokeWidth={2.25} fill="url(#balanceFill)" dot={{ r: 3, fill: CHART.single, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fffcf4' }} isAnimationActive={animate} animationDuration={900} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
